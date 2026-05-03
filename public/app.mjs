import { installAutomaginariumPacked } from "./generated/automate_packed_runtime.mjs";
import { generateRandomTable, generateSymmetricTable, generateTotalisticTable } from "./rule-generation.mjs";

await installAutomaginariumPacked();

const PRESETS = [
  { id: "wolfram-30", label: "Wolfram 30" },
  { id: "wolfram-90", label: "Wolfram 90" },
  { id: "wolfram-110", label: "Wolfram 110" },
  { id: "binaire-5-sillage", label: "Binaire 5 - Sillage" },
  { id: "ternaire-totalistique", label: "Ternaire totalistique" },
  { id: "quaternaire-cristal", label: "Quaternaire cristal" },
  { id: "multi-canal-aurore", label: "Multi-canal Aurore" },
  { id: "symboles-jardin", label: "Symboles jardin" },
];

const state = { config: null, universe: null, lastValidConfig: null };
const presetCache = new Map();
const canvas = document.querySelector("#universe");
const ctx = canvas.getContext("2d");
const title = document.querySelector("#config-title");
const meta = document.querySelector("#config-meta");
const statusBox = document.querySelector("#validation-status");
const tableView = document.querySelector("#rule-table");
const ruleDetailView = document.querySelector("#rule-table-detail");
const transitionSignals = document.querySelector("#transition-signals");
const universeLiveSummary = document.querySelector("#universe-live-summary");
const transitionLiveSummary = document.querySelector("#transition-live-summary");
const syncIndicatorDot = document.querySelector("#sync-indicator-dot");
const syncIndicatorText = document.querySelector("#sync-indicator-text");
const heroSyncDot = document.querySelector("#hero-sync-dot");
const heroStatusText = document.querySelector("#hero-status-text");
const presetCards = [...document.querySelectorAll("[data-preset]")];
const inspectorTabs = [...document.querySelectorAll(".inspector-tab-btn")];
const inspectorPanels = [...document.querySelectorAll(".inspector-panel")];
const controls = {
  preset: document.querySelector("#preset"),
  name: document.querySelector("#config-name"),
  alphabetInput: document.querySelector("#alphabet-input"),
  alphabetOutput: document.querySelector("#alphabet-output"),
  neighborhood: document.querySelector("#neighborhood-size"),
  channels: document.querySelector("#channel-count"),
  width: document.querySelector("#grid-width"),
  height: document.querySelector("#grid-height"),
  boundary: document.querySelector("#boundary-mode"),
  initialMode: document.querySelector("#initial-mode"),
  initialValues: document.querySelector("#initial-values"),
  initialProbability: document.querySelector("#initial-probability"),
  cellSize: document.querySelector("#cell-size"),
  ruleMode: document.querySelector("#rule-mode"),
  wolframRule: document.querySelector("#wolfram-rule"),
  ruleNumber: document.querySelector("#rule-number"),
  randomRule: document.querySelector("#random-rule"),
  ruleSpaceSize: document.querySelector("#rule-space-size"),
  ruleGenerator: document.querySelector("#rule-generator"),
  json: document.querySelector("#config-json"),
  importJson: document.querySelector("#import-json"),
};
const liveControlEntries = [
  [controls.name, "input"],
  [controls.alphabetInput, "input"],
  [controls.alphabetOutput, "input"],
  [controls.neighborhood, "input"],
  [controls.channels, "input"],
  [controls.width, "input"],
  [controls.height, "input"],
  [controls.boundary, "change"],
  [controls.initialMode, "change"],
  [controls.initialValues, "input"],
  [controls.initialProbability, "input"],
  [controls.cellSize, "input"],
  [controls.ruleMode, "change"],
  [controls.ruleNumber, "input"],
];
let liveApplyTimer = null;

function setActiveInspectorPanel(panelId) {
  inspectorTabs.forEach((tab) => {
    const active = tab.dataset.panel === panelId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  inspectorPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

function parseSymbol(raw) {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && String(numeric) === trimmed ? numeric : trimmed;
}

function parseList(value, fallback) {
  const parsed = value.split(",").map(parseSymbol).filter((item) => item !== null);
  return parsed.length > 0 ? parsed : fallback;
}

function encodeList(values) {
  return (values || []).join(",");
}

function controlsToConfig() {
  const inputAlphabet = parseList(controls.alphabetInput.value, [0, 1]);
  const outputAlphabet = parseList(controls.alphabetOutput.value, inputAlphabet);
  let neighborhood = Number(controls.neighborhood.value || 3);
  if (neighborhood % 2 === 0) neighborhood += 1;
  const current = state.config || {};
  const initialMode = controls.initialMode.value;
  const config = {
    ...current,
    nom: controls.name.value.trim() || "Univers sans nom",
    alphabet_entree: inputAlphabet,
    alphabet_sortie: outputAlphabet,
    taille_voisinage: Math.max(1, neighborhood),
    nombre_canaux_sortie: Math.max(1, Number(controls.channels.value || 1)),
    largeur: Math.max(1, Number(controls.width.value || 161)),
    hauteur: Math.max(1, Number(controls.height.value || 100)),
    frontiere: controls.boundary.value,
    mode_regle: controls.ruleMode.value,
    numero_regle: controls.ruleNumber.value || "0",
    etat_initial: { mode: initialMode },
    rendu: { ...(current.rendu || {}), taille_cellule: Math.max(1, Number(controls.cellSize.value || 5)) },
  };
  if (initialMode === "motif") {
    config.etat_initial.valeurs = parseList(controls.initialValues.value, [outputAlphabet[1] ?? outputAlphabet[0]]);
  }
  if (initialMode === "aleatoire") {
    config.etat_initial.graine = current.etat_initial?.graine ?? 42;
    config.etat_initial.probabilite = Math.max(0, Math.min(1, Number(controls.initialProbability.value || 0.28)));
  }
  const alphabetChanged = current.alphabet_entree && (
    current.alphabet_entree.length !== inputAlphabet.length ||
    current.taille_voisinage !== neighborhood ||
    current.nombre_canaux_sortie !== config.nombre_canaux_sortie
  );
  if (alphabetChanged) {
    config.table_transition = {};
  } else if (!config.table_transition) {
    config.table_transition = {};
  }
  return config;
}

function validateConfig(config) {
  const result = window.AutomaginariumCore.validerConfiguration(config);
  return {
    valid: result.valide,
    errors: result.erreurs,
    warnings: result.avertissements.length > 0
      ? [`${result.avertissements.length} avertissement(s); voir le JSON pour details.`]
      : [],
  };
}

function showStatus(result) {
  statusBox.className = `status ${result.valid ? "ok" : "error"}`;
  if (!result.valid) {
    statusBox.textContent = result.errors.join(" ");
    return;
  }
  statusBox.textContent = result.warnings.length > 0 ? result.warnings.join(" ") : "Configuration valide";
}

function setSyncState(kind, text) {
  if (syncIndicatorDot) syncIndicatorDot.dataset.state = kind;
  if (syncIndicatorText) syncIndicatorText.textContent = text;
  if (heroSyncDot) heroSyncDot.dataset.state = kind;
  if (heroStatusText) heroStatusText.textContent = text;
}

function syncControls(config) {
  controls.name.value = config.nom || "";
  controls.alphabetInput.value = encodeList(config.alphabet_entree || [0, 1]);
  controls.alphabetOutput.value = encodeList(config.alphabet_sortie || config.alphabet_entree || [0, 1]);
  controls.neighborhood.value = config.taille_voisinage || 3;
  controls.channels.value = config.nombre_canaux_sortie || 1;
  controls.width.value = config.largeur || 161;
  controls.height.value = config.hauteur || 100;
  controls.boundary.value = config.frontiere || "fixe";
  controls.initialMode.value = config.etat_initial?.mode || "centre";
  controls.initialValues.value = encodeList(config.etat_initial?.valeurs || []);
  controls.initialProbability.value = config.etat_initial?.probabilite ?? 0.28;
  controls.cellSize.value = config.rendu?.taille_cellule || 5;
  controls.ruleMode.value = config.mode_regle || "table";
  controls.ruleNumber.value = config.numero_regle ? String(config.numero_regle) : "0";
  controls.json.value = JSON.stringify({ ...config, numero_regle: String(config.numero_regle || 0n) }, null, 2);
}

function setActivePreset(id) {
  presetCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.preset === id);
  });
}

const DEFAULT_PALETTES = {
  2: ["#0066ff", "#ff6b35"],
  3: ["#0066ff", "#00ff41", "#ff6b35"],
  4: ["#0066ff", "#00aaff", "#00ff41", "#ff6b35"],
  5: ["#0066ff", "#00aaff", "#00ff41", "#ffaa00", "#ff6b35"],
  6: ["#0066ff", "#00aaff", "#00ffaa", "#00ff41", "#ffaa00", "#ff6b35"],
  8: ["#0066ff", "#00aaff", "#00ddff", "#00ff41", "#ffff00", "#ffaa00", "#ff6b35", "#ff0055"],
};

function getDefaultPalette(alphabetSize) {
  return DEFAULT_PALETTES[alphabetSize] || (DEFAULT_PALETTES[alphabetSize] =
    Array.from({ length: alphabetSize }, (_, index) => {
      const hue = (index / alphabetSize) * 360;
      return `hsl(${Math.round(hue)}, 100%, 50%)`;
    })
  );
}

function colorFor(value, config, channels) {
  const visualValue = channels && channels.length > 1 ? channels[1] : value;
  const alphabet = config.alphabet_sortie || config.alphabet_entree || [0, 1];
  let index = alphabet.findIndex((item) => String(item) === String(visualValue));
  if (index < 0) index = Math.abs(Number(visualValue) || Number(value) || 0) % alphabet.length;
  const palette = config.rendu.palette || getDefaultPalette(alphabet.length);
  return palette[index % palette.length] || palette[0];
}

function summarizeConfig(config) {
  return `${config.largeur} x ${config.hauteur} cellules, ${config.alphabet_sortie.length} etat(s) visibles, voisinage ${config.taille_voisinage}, depart ${config.etat_initial?.mode || "centre"}`;
}

function summarizeTransition(config) {
  const entries = Object.entries(config.table_transition || {});
  if (config.mode_regle === "totalistique") {
    return `Mode totalistique avec ${config.alphabet_sortie.length} etat(s) de sortie.`;
  }
  if (entries.length === 0) {
    return `Mode ${config.mode_regle} pilote par le noyau sans table explicite.`;
  }
  return `${entries.length} transition(s) actives dans la table en cours.`;
}

function renderTransitionSignals(config) {
  if (!transitionSignals) return;
  const entries = Object.entries(config.table_transition || {}).slice(0, 6);
  transitionSignals.innerHTML = "";
  if (entries.length === 0) {
    const card = document.createElement("div");
    card.className = "transition-signal-card";
    card.innerHTML = `<span class="transition-signal-label">${config.mode_regle}</span><strong>Noyau dynamique</strong><p>Les sorties sont derivees sans table visible.</p>`;
    transitionSignals.appendChild(card);
    return;
  }
  entries.forEach(([key, value], index) => {
    const card = document.createElement("div");
    card.className = "transition-signal-card";
    card.innerHTML = `<span class="transition-signal-label">Transition ${index + 1}</span><strong>${key}</strong><p>${JSON.stringify(value)}</p>`;
    transitionSignals.appendChild(card);
  });
}

function updatePaletteEditor() {
  const editor = document.querySelector("#palette-editor");
  if (!state.config || !editor) return;
  const config = state.config;
  const alphabet = config.alphabet_sortie || config.alphabet_entree || [0, 1];
  const palette = config.rendu.palette || getDefaultPalette(alphabet.length);
  editor.innerHTML = "";
  alphabet.forEach((symbol, index) => {
    const row = document.createElement("div");
    row.className = "palette-color-row";
    const label = document.createElement("span");
    label.textContent = String(symbol);
    const input = document.createElement("input");
    input.type = "color";
    input.value = palette[index] || "#ffffff";
    input.addEventListener("input", (event) => {
      state.config.rendu = state.config.rendu || {};
      if (!state.config.rendu.palette) state.config.rendu.palette = [...palette];
      state.config.rendu.palette[index] = event.target.value;
      render();
    });
    row.append(label, input);
    editor.appendChild(row);
  });
}

function updateHudRule() {
  const neighborhood = Number(controls.neighborhood.value || 3);
  const channels = Number(controls.channels.value || 1);
  const ruleMode = controls.ruleMode.value || "table";
  const wolframRule = controls.wolframRule.value || "90";
  let value = wolframRule;
  if (ruleMode === "totalistique") {
    value = `Tot(${neighborhood})`;
  } else if (ruleMode === "aleatoire") {
    value = `Alea(${neighborhood})`;
  } else if (ruleMode === "numerique") {
    value = `R${neighborhood}x${channels}`;
  } else if (ruleMode === "table") {
    value = `T${neighborhood}x${channels}`;
  }
  document.querySelector("#hud-rule").textContent = value;
}

function updateHudMetrics(universe) {
  const { configuration, lignes } = universe;
  const totalCells = Math.max(1, configuration.largeur * configuration.hauteur);
  const activeCells = lignes.flat().filter((value) => String(value) !== String(configuration.alphabet_entree[0])).length;
  const density = Math.round((activeCells / totalCells) * 100);
  const counts = new Map();
  lignes.flat().forEach((value) => {
    const key = String(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  let entropy = 0;
  counts.forEach((count) => {
    const probability = count / totalCells;
    entropy -= probability > 0 ? probability * Math.log2(probability) : 0;
  });
  document.querySelector("#hud-gen").textContent = String(configuration.hauteur);
  document.querySelector("#hud-density").textContent = `${density}%`;
  document.querySelector("#hud-entropy").textContent = entropy.toFixed(2);
}

function resizeCanvas(config) {
  const cell = Number(config.rendu.taille_cellule || 5);
  canvas.width = config.largeur * cell;
  canvas.height = config.hauteur * cell;
}

function render() {
  if (!state.universe) return;
  const { configuration, lignes, sorties } = state.universe;
  resizeCanvas(configuration);
  resizeOverlayCanvas(configuration);
  const cell = Number(configuration.rendu.taille_cellule || 5);
  ctx.fillStyle = configuration.rendu.fond || "#05070d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  lignes.forEach((line, y) => {
    line.forEach((value, x) => {
      const channels = sorties?.[y]?.[x];
      const visualValue = channels && channels.length > 1 ? channels[1] : value;
      const bgValue = configuration.alphabet_sortie?.[0] ?? configuration.alphabet_entree[0];
      if (!configuration.rendu.afficher_zero && String(visualValue) === String(bgValue)) return;
      ctx.fillStyle = colorFor(value, configuration, channels);
      ctx.fillRect(x * cell, y * cell, cell, cell);
    });
  });
  updateHudMetrics(state.universe);
}

function describe(config) {
  title.textContent = config.nom;
  meta.textContent = `${config.alphabet_entree.length} symbole(s) entree | ${config.alphabet_sortie.length} sortie | voisinage ${config.taille_voisinage} | ${config.nombre_canaux_sortie} canal(aux) | ${config.mode_regle}`;
  const entries = Object.entries(config.table_transition || {}).slice(0, 24);
  const content = entries.length > 0
    ? entries.map(([key, value]) => `<span><b>${key}</b> -> ${JSON.stringify(value)}</span>`).join("")
    : `<span><b>${config.mode_regle}</b> -> genere par le noyau</span>`;
  tableView.innerHTML = content;
  ruleDetailView.innerHTML = content;
  renderTransitionSignals(config);
  if (universeLiveSummary) {
    universeLiveSummary.innerHTML = `<span class="live-summary-label">Projection</span><strong>${summarizeConfig(config)}</strong>`;
  }
  if (transitionLiveSummary) {
    transitionLiveSummary.innerHTML = `<span class="live-summary-label">Reponse</span><strong>${summarizeTransition(config)}</strong>`;
  }
}

function updateRuleSpaceDisplay(config) {
  const { s, k, t, m, maxRule } = window.AutomaginariumCore.ruleConfiguration(config);
  controls.ruleSpaceSize.textContent = `${t}^(${m}·${s}^${k}) = ${maxRule} regles possibles`;
}

function queueLiveApply(source = "Configuration live") {
  window.clearTimeout(liveApplyTimer);
  liveApplyTimer = window.setTimeout(() => {
    applyConfig(controlsToConfig(), { source });
  }, 120);
}

function activateInitialMode(mode) {
  if (controls.initialMode.value === mode) return;
  controls.initialMode.value = mode;
}

function applyConfig(config, { source = "Configuration" } = {}) {
  try {
    console.log("applyConfig called with source:", source);
    const normalized = window.AutomaginariumCore.normaliserConfiguration(config);
    console.log("Config normalized, mode_regle:", normalized.mode_regle);

    // Ensure table_transition is not empty
    if (!normalized.table_transition || Object.keys(normalized.table_transition).length === 0) {
      console.warn("table_transition is empty, populating defaults");
      const cles = window.AutomaginariumCore.toutesClesVoisinage(normalized.alphabet_entree, normalized.taille_voisinage);
      normalized.table_transition = {};
      cles.slice(0, Math.min(5, cles.length)).forEach((cle) => {
        normalized.table_transition[cle] = [normalized.alphabet_sortie[0]];
      });
    }

    const validation = validateConfig(normalized);
    showStatus(validation);
    if (!validation.valid) {
      console.error("Config validation failed:", validation.errors);
      setSyncState("error", `Correction requise: ${validation.errors[0] || "configuration invalide"}`);
      return false;
    }
    state.config = normalized;
    state.lastValidConfig = structuredClone(normalized);
    console.log("Generating universe...");
    state.universe = window.AutomaginariumCore.genererUnivers(normalized);
    console.log("Universe generated, lignes length:", state.universe?.lignes?.length);
    if (!state.universe || !state.universe.lignes || state.universe.lignes.length === 0) {
      console.error("Universe is empty");
      setSyncState("error", "Erreur: univers vide généré");
      return false;
    }
    console.log("Syncing controls and rendering...");
    syncControls(normalized);
    describe(normalized);
    updateRuleSpaceDisplay(normalized);
    updatePaletteEditor();
    updateHudRule();
    render();
    console.log("Render complete");
    setSyncState("ok", `${source} chargee`);
    return true;
  } catch (error) {
    console.error("applyConfig error:", error);
    setSyncState("error", `Erreur: ${error.message}`);
    return false;
  }
}

async function fetchPreset(id) {
  if (presetCache.has(id)) return structuredClone(presetCache.get(id));
  const response = await fetch(`../examples/${id}.json`);
  if (!response.ok) throw new Error(`Preset introuvable: ${id}`);
  const config = await response.json();
  presetCache.set(id, config);
  return structuredClone(config);
}

async function loadPreset(id) {
  const config = await fetchPreset(id);
  controls.preset.value = id;
  setActivePreset(id);
  applyConfig(config, { source: `Preset ${id}` });
}

function buildGeneratedRuleConfig() {
  const config = window.AutomaginariumCore.normaliserConfiguration(controlsToConfig());
  let generator = controls.ruleGenerator.value;
  const isBinaryAlphabet = config.alphabet_entree.length === 2
    && String(config.alphabet_entree[0]) === "0"
    && String(config.alphabet_entree[1]) === "1";
  if (generator === "wolfram" && (config.taille_voisinage !== 3 || !isBinaryAlphabet || config.nombre_canaux_sortie !== 1)) {
    generator = "random";
    controls.ruleGenerator.value = "random";
  }
  if (generator === "wolfram") {
    config.alphabet_entree = [0, 1];
    config.alphabet_sortie = [0, 1];
    config.taille_voisinage = 3;
    config.nombre_canaux_sortie = 1;
    config.mode_regle = "table";
    config.table_transition = window.AutomaginariumCore.tableWolfram(Number(controls.wolframRule.value || 90));
  } else if (generator === "random") {
    config.mode_regle = "table";
    config.table_transition = generateRandomTable(config);
  } else if (generator === "symmetric") {
    config.mode_regle = "table";
    config.table_transition = generateSymmetricTable(config);
  } else if (generator === "totalistic") {
    config.mode_regle = "totalistique";
    config.table_transition = generateTotalisticTable(config);
  }
  return config;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function randomBigInt(max) {
  const bits = max.toString(2).length;
  const words = Math.ceil(bits / 32) + 1;
  const random = window.AutomaginariumCore.mulberry32(Date.now() >>> 0);
  let value = 0n;
  for (let index = 0; index < words; index += 1) {
    value = (value << 32n) | BigInt(Math.floor(random() * 0x100000000));
  }
  return value % max;
}

PRESETS.forEach((preset) => {
  const option = document.createElement("option");
  option.value = preset.id;
  option.textContent = preset.label;
  controls.preset.appendChild(option);
});

inspectorTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveInspectorPanel(tab.dataset.panel));
});
controls.preset.addEventListener("change", () => loadPreset(controls.preset.value));
presetCards.forEach((card) => {
  card.addEventListener("click", () => loadPreset(card.dataset.preset));
});
liveControlEntries.forEach(([control, eventName]) => {
  control.addEventListener(eventName, () => {
    updateHudRule();
    queueLiveApply();
  });
});
controls.initialValues.addEventListener("input", () => {
  if (controls.initialValues.value.trim() === "") return;
  activateInitialMode("motif");
  queueLiveApply();
});
controls.initialProbability.addEventListener("input", () => {
  if (controls.initialProbability.value === "") return;
  activateInitialMode("aleatoire");
  queueLiveApply();
});
controls.wolframRule.addEventListener("input", () => {
  updateHudRule();
  if (controls.ruleGenerator.value !== "wolfram") return;
  window.clearTimeout(liveApplyTimer);
  liveApplyTimer = window.setTimeout(() => {
    controls.ruleMode.value = "table";
    controls.ruleNumber.value = String(controls.wolframRule.value || 90);
    applyConfig(buildGeneratedRuleConfig(), { source: "Regles live" });
  }, 120);
});
controls.ruleGenerator.addEventListener("change", () => {
  if (controls.ruleGenerator.value !== "wolfram") return;
  controls.ruleMode.value = "table";
  controls.ruleNumber.value = String(controls.wolframRule.value || 90);
  updateHudRule();
  applyConfig(buildGeneratedRuleConfig(), { source: "Regles live" });
});
document.querySelector("#generate-rule").addEventListener("click", () => {
  applyConfig(buildGeneratedRuleConfig(), { source: "Regles" });
});
function applyRandomRule() {
  const config = window.AutomaginariumCore.normaliserConfiguration(controlsToConfig());
  const { maxRule } = window.AutomaginariumCore.ruleConfiguration(config);
  controls.ruleNumber.value = randomBigInt(maxRule).toString();
  controls.ruleMode.value = "numerique";
  applyConfig(controlsToConfig(), { source: "Regle aleatoire" });
}

document.querySelector("#random-rule").addEventListener("click", applyRandomRule);
document.querySelector("#random-rule-canvas").addEventListener("click", applyRandomRule);
document.querySelector("#apply-json").addEventListener("click", () => {
  try {
    applyConfig(JSON.parse(controls.json.value), { source: "JSON" });
  } catch (error) {
    showStatus({ valid: false, errors: [`JSON invalide: ${error.message}`], warnings: [] });
    setSyncState("error", "JSON invalide");
  }
});
document.querySelector("#reset-json").addEventListener("click", () => {
  controls.json.value = JSON.stringify(state.lastValidConfig || state.config, null, 2);
});
controls.importJson.addEventListener("change", async () => {
  const file = controls.importJson.files[0];
  if (!file) return;
  try {
    applyConfig(JSON.parse(await file.text()), { source: "Import JSON" });
  } catch (error) {
    showStatus({ valid: false, errors: [`Import impossible: ${error.message}`], warnings: [] });
    setSyncState("error", "Import JSON impossible");
  }
});
document.querySelector("#export-json").addEventListener("click", () => {
  downloadText(`${state.config?.nom || "automaginarium"}.json`, JSON.stringify(state.config, null, 2));
});
document.querySelector("#export-png").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${state.universe?.configuration.nom || "automaginarium"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

/* ============================================================================ */
/* GENETIC ALGORITHM STATE AND FUNCTIONS */
/* ============================================================================ */

const gaState = {
  population: [],
  evaluated: [],
  fitnessHistory: [],
  generation: 0,
  running: false,
  evolveTimer: null,
  poids: { symetrie: 5, densite: 5, stabilite: 5, oscillation: 5, complexite: 5, croissance: 5 },
};

function renderGaFitnessGraph(history) {
  const canvas = document.querySelector("#ga-fitness-graph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.fillStyle = "#0a0e17";
  ctx.fillRect(0, 0, width, height);
  if (history.length === 0) return;
  const maxScore = Math.max(...history.map(h => Math.max(h.best, h.avg)), 1);
  const scale = height / maxScore;
  ctx.strokeStyle = "rgba(0, 255, 200, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((h, i) => {
    const x = (i / Math.max(1, history.length - 1)) * width;
    const y = height - (h.best * scale);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.strokeStyle = "rgba(125, 211, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  history.forEach((h, i) => {
    const x = (i / Math.max(1, history.length - 1)) * width;
    const y = height - (h.avg * scale);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderGaLeaderboard(evaluated) {
  const container = document.querySelector("#ga-leaderboard");
  if (!container) return;
  const leaderboardDiv = container.querySelector(".genetic-leaderboard") || container;
  if (!state.config || !state.config.nombre_canaux_sortie) {
    leaderboardDiv.innerHTML = "<p style=\"color: var(--muted); font-size: 0.8rem;\">Aucune population evaluee</p>";
    return;
  }
  const numChannels = state.config.nombre_canaux_sortie;
  const bestPerChannel = Array.from({ length: numChannels }, (_, ch) => ({
    channel: ch,
    score: -1,
    label: `Canal ${ch}`,
  }));
  evaluated.forEach(({ metriques }) => {
    if (metriques && metriques.scores_par_canal && metriques.scores_par_canal[0] !== undefined) {
      metriques.scores_par_canal.forEach((chScore, chIdx) => {
        if (chIdx < bestPerChannel.length && chScore > bestPerChannel[chIdx].score) {
          bestPerChannel[chIdx].score = chScore;
        }
      });
    }
  });
  leaderboardDiv.innerHTML = "<h3 style=\"margin: 0 0 var(--space-md) 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted);\">Meilleur par canal</h3>";
  bestPerChannel.forEach(({ label, score }) => {
    const item = document.createElement("div");
    item.className = "genetic-leaderboard-item";
    item.innerHTML = `<span class="genetic-leaderboard-label">${label}</span><span class="genetic-leaderboard-score">${score >= 0 ? score.toFixed(3) : "—"}</span>`;
    leaderboardDiv.appendChild(item);
  });
}

function renderGaPopulationBrowser(evaluated) {
  const container = document.querySelector("#ga-population-browser");
  if (!container || evaluated.length === 0) {
    if (container) container.innerHTML = "<p style=\"color: var(--muted); font-size: 0.8rem;\">Population vide</p>";
    return;
  }
  const sorted = [...evaluated].sort((a, b) => b.score - a.score);
  container.innerHTML = "";
  sorted.forEach((ind, idx) => {
    const card = document.createElement("div");
    card.className = `genetic-individu-card ${idx === 0 ? "meilleur" : ""}`;
    const scoreHtml = `<div class="genetic-individu-score"><span>${idx === 0 ? "★" : ""} #${idx + 1}</span><span>${ind.score.toFixed(4)}</span></div>`;
    const metaHtml = `<div class="genetic-individu-meta">Gen ${gaState.generation} • ${ind.config.nom || "Sans nom"}</div>`;
    const actionBtn = `<button>Adopter</button>`;
    card.innerHTML = scoreHtml + metaHtml + `<div class="genetic-individu-actions">${actionBtn}</div>`;
    card.querySelector("button").addEventListener("click", () => {
      applyConfig(ind.config, { source: "AG Adoption" });
    });
    container.appendChild(card);
  });
}

function runGaStep() {
  if (gaState.population.length === 0) return;
  gaState.evaluated = window.AutomaginariumCore.evaluerPopulation(gaState.population, gaState.poids);
  const bestIndividual = gaState.evaluated.reduce((a, b) => a.score > b.score ? a : b);
  const bestScore = bestIndividual.score;
  const avg = gaState.evaluated.reduce((sum, ind) => sum + ind.score, 0) / gaState.evaluated.length;
  gaState.fitnessHistory.push({ best: bestScore, avg });
  gaState.generation += 1;
  const newPop = window.AutomaginariumCore.nouvelleGeneration(
    gaState.population,
    gaState.evaluated.map(e => e.score),
    50,
    Math.floor(Math.random() * 0x100000000)
  );
  gaState.population = newPop;
  const statusEl = document.querySelector("#ga-status");
  if (statusEl) statusEl.textContent = `Gen ${gaState.generation} • Meilleur: ${bestScore.toFixed(4)} • Moyen: ${avg.toFixed(4)}`;
  renderGaFitnessGraph(gaState.fitnessHistory);
  renderGaLeaderboard(gaState.evaluated);
  renderGaPopulationBrowser(gaState.evaluated);
}

function scheduleGaStep() {
  if (!gaState.running) return;
  runGaStep();
  gaState.evolveTimer = setTimeout(scheduleGaStep, 80);
}

const gaControls = {
  init: document.querySelector("#ga-init"),
  step: document.querySelector("#ga-step"),
  evolve: document.querySelector("#ga-evolve"),
  reset: document.querySelector("#ga-reset"),
  applyBest: document.querySelector("#ga-apply-best"),
  populationSize: document.querySelector("#ga-taille-population"),
  presetBtns: [...document.querySelectorAll(".genetic-preset-btn")],
  weightSliders: {
    symetrie: document.querySelector("#ga-w-symetrie"),
    densite: document.querySelector("#ga-w-densite"),
    stabilite: document.querySelector("#ga-w-stabilite"),
    oscillation: document.querySelector("#ga-w-oscillation"),
    complexite: document.querySelector("#ga-w-complexite"),
    croissance: document.querySelector("#ga-w-croissance"),
  },
};

if (gaControls.init) {
  gaControls.init.addEventListener("click", () => {
    try {
      if (!state.config) {
        const statusEl = document.querySelector("#ga-status");
        if (statusEl) statusEl.textContent = "Erreur: aucune configuration chargee";
        return;
      }
      console.log("Initial config mode_regle:", state.config.mode_regle);
      console.log("Initial table_transition keys:", Object.keys(state.config.table_transition || {}).length);
      const size = Number(gaControls.populationSize?.value || 16);
      gaState.generation = 0;
      gaState.fitnessHistory = [];
      gaState.population = window.AutomaginariumCore.populationInitiale(state.config, size, Math.floor(Math.random() * 0x100000000));
      if (!gaState.population || gaState.population.length === 0) {
        const statusEl = document.querySelector("#ga-status");
        if (statusEl) statusEl.textContent = "Erreur: population vide";
        return;
      }
      console.log("Initial population size:", gaState.population.length);
      if (gaState.population.length > 0) {
        console.log("First individual table keys:", Object.keys(gaState.population[0].table_transition || {}).length);
        const t1 = gaState.population[0].table_transition;
        console.log("First individual outputs:",
          Object.keys(t1).map(k => `${k}:${JSON.stringify(t1[k])}`).join(" | "));
        if (gaState.population.length > 1) {
          const t2 = gaState.population[1].table_transition;
          console.log("Second individual outputs:",
            Object.keys(t2).map(k => `${k}:${JSON.stringify(t2[k])}`).join(" | "));
        }
      }
      runGaStep();
      const statusEl = document.querySelector("#ga-status");
      if (statusEl) statusEl.textContent = `Population initialisee: ${gaState.population.length} individus`;
    } catch (error) {
      console.error("GA initialization error:", error);
      const statusEl = document.querySelector("#ga-status");
      if (statusEl) statusEl.textContent = `Erreur: ${error.message}`;
    }
  });
}

if (gaControls.step) {
  gaControls.step.addEventListener("click", runGaStep);
}

if (gaControls.evolve) {
  gaControls.evolve.addEventListener("click", () => {
    if (!state.config) return;
    gaState.running = !gaState.running;
    gaControls.evolve.textContent = gaState.running ? "Pause" : "Evoluer";
    if (gaState.running) scheduleGaStep();
    else clearTimeout(gaState.evolveTimer);
  });
}

if (gaControls.reset) {
  gaControls.reset.addEventListener("click", () => {
    gaState.population = [];
    gaState.evaluated = [];
    gaState.fitnessHistory = [];
    gaState.generation = 0;
    gaState.running = false;
    clearTimeout(gaState.evolveTimer);
    gaControls.evolve.textContent = "Evoluer";
    document.querySelector("#ga-status").textContent = "Reinitialise";
    document.querySelector("#ga-population-browser").innerHTML = "";
    const canvas = document.querySelector("#ga-fitness-graph");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0a0e17";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });
}

if (gaControls.applyBest) {
  gaControls.applyBest.addEventListener("click", () => {
    if (gaState.evaluated.length === 0) {
      alert("Aucun individu evalue");
      return;
    }
    const bestIndividual = gaState.evaluated.reduce((a, b) => a.score > b.score ? a : b);
    if (!bestIndividual || !bestIndividual.config) {
      alert("Erreur: individu meilleur invalide");
      return;
    }
    console.log("Best individual config:", bestIndividual.config);
    console.log("Table transition keys:", Object.keys(bestIndividual.config.table_transition || {}).length);
    const t = bestIndividual.config.table_transition;
    console.log("Best individual outputs:",
      Object.keys(t).map(k => `${k}:${JSON.stringify(t[k])}`).join(" | "));
    const result = applyConfig(bestIndividual.config, { source: "AG Meilleur individu" });
    if (!result) {
      alert("Erreur: configuration meilleur invalide ou universes vide");
    }
  });
}

Object.entries(gaControls.weightSliders).forEach(([key, slider]) => {
  if (!slider) return;
  slider.addEventListener("input", (e) => {
    gaState.poids[key] = Number(e.target.value);
    const valSpan = document.querySelector(`#ga-w-${key}-val`);
    if (valSpan) valSpan.textContent = e.target.value;
  });
});

gaControls.presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.dataset.presetFitness;
    const weights = window.AutomaginariumCore.presetPoidsGenetique(preset);
    if (weights) {
      gaState.poids = weights;
      Object.entries(gaControls.weightSliders).forEach(([key, slider]) => {
        if (slider && gaState.poids[key] !== undefined) {
          slider.value = gaState.poids[key];
          const valSpan = document.querySelector(`#ga-w-${key}-val`);
          if (valSpan) valSpan.textContent = gaState.poids[key];
        }
      });
    }
  });
});

/* ============================================================================ */
/* PERTURBATION TOOLKIT STATE AND FUNCTIONS */
/* ============================================================================ */

const perturbState = {
  toolActif: "inspecter",
  type: "pulse",
  rayon: 10,
  force: 0.5,
  gelDuree: 5,
  masqueGel: new Map(),
  fxAnneaux: true,
  fxFumee: true,
  fxChaleur: false,
  evenements: [],
  particules: [],
  anneaux: [],
  heatMap: null,
  isDragging: false,
  animFrameId: null,
};

let overlayCanvas = null;
let overlayCtx = null;

function initOverlayCanvas() {
  const wrap = document.querySelector(".canvas-wrap");
  if (!wrap || overlayCanvas) return;
  overlayCanvas = document.createElement("canvas");
  overlayCanvas.id = "perturb-overlay";
  overlayCanvas.style.position = "absolute";
  overlayCanvas.style.top = "0";
  overlayCanvas.style.left = "0";
  overlayCanvas.style.pointerEvents = "none";
  overlayCanvas.style.zIndex = "5";
  wrap.appendChild(overlayCanvas);
  overlayCtx = overlayCanvas.getContext("2d");
}

function resizeOverlayCanvas(config) {
  if (!overlayCanvas) return;
  const cell = Number(config.rendu.taille_cellule || 5);
  overlayCanvas.width = config.largeur * cell;
  overlayCanvas.height = config.hauteur * cell;
}

function spawnGlowRing(cx, cy, rayon) {
  if (!perturbState.fxAnneaux) return;
  perturbState.anneaux.push({ cx, cy, rayon, life: 1, age: 0 });
}

function spawnSmokeTrail(cx, cy) {
  if (!perturbState.fxFumee) return;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const vx = Math.cos(angle) * (1 + Math.random());
    const vy = Math.sin(angle) * (1 + Math.random());
    perturbState.particules.push({
      x: cx * cellSize + cellSize / 2,
      y: cy * cellSize + cellSize / 2,
      vx,
      vy,
      life: 1,
      age: 0,
      radius: cellSize * 0.3,
    });
  }
}

function updateHeatMap(cx, cy, rayon, cellSize) {
  if (!perturbState.fxChaleur || !state.config) return;
  if (!perturbState.heatMap) {
    const size = state.config.largeur * state.config.hauteur;
    perturbState.heatMap = new Float32Array(size);
  }
  const cxPx = cx * cellSize;
  const cyPx = cy * cellSize;
  const radiusPx = rayon * cellSize;
  const { largeur, hauteur } = state.config;
  for (let y = Math.max(0, cy - rayon - 1); y < Math.min(hauteur, cy + rayon + 2); y++) {
    for (let x = Math.max(0, cx - rayon - 1); x < Math.min(largeur, cx + rayon + 2); x++) {
      const dx = x * cellSize + cellSize / 2 - cxPx;
      const dy = y * cellSize + cellSize / 2 - cyPx;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radiusPx) {
        const intensity = 1 - (dist / radiusPx);
        perturbState.heatMap[y * largeur + x] = Math.min(1, perturbState.heatMap[y * largeur + x] + intensity * 0.3);
      }
    }
  }
}

function renderGlowRings(cellSize) {
  if (!overlayCtx || perturbState.anneaux.length === 0) return;
  perturbState.anneaux.forEach((ring, idx) => {
    ring.age += 0.05;
    ring.life = Math.max(0, 1 - ring.age);
    if (ring.life <= 0) {
      perturbState.anneaux.splice(idx, 1);
      return;
    }
    const interp = ring.age;
    overlayCtx.strokeStyle = `rgba(0, 255, 200, ${ring.life * 0.5})`;
    overlayCtx.lineWidth = 2;
    overlayCtx.beginPath();
    overlayCtx.arc(ring.cx * cellSize + cellSize / 2, ring.cy * cellSize + cellSize / 2, ring.radius + interp * 20, 0, Math.PI * 2);
    overlayCtx.stroke();
  });
}

function renderSmokeTrails() {
  if (!overlayCtx || perturbState.particules.length === 0) return;
  perturbState.particules.forEach((p, idx) => {
    p.x += p.vx;
    p.y += p.vy;
    p.age += 0.02;
    p.life = Math.max(0, 1 - p.age);
    p.vy += 0.05;
    if (p.life <= 0) {
      perturbState.particules.splice(idx, 1);
      return;
    }
    overlayCtx.fillStyle = `rgba(0, 255, 200, ${p.life * 0.4})`;
    overlayCtx.beginPath();
    overlayCtx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    overlayCtx.fill();
  });
}

function renderHeatMap(cellSize) {
  if (!overlayCtx || !perturbState.heatMap || !state.config) return;
  const { largeur, hauteur } = state.config;
  const imageData = overlayCtx.createImageData(Math.ceil(largeur * cellSize), Math.ceil(hauteur * cellSize));
  const data = imageData.data;
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const heatVal = perturbState.heatMap[y * largeur + x];
      for (let py = 0; py < cellSize; py++) {
        for (let px = 0; px < cellSize; px++) {
          const idx = ((y * cellSize + py) * Math.ceil(largeur * cellSize) + (x * cellSize + px)) * 4;
          const hue = heatVal * 240;
          const rgb = hslToRgb(hue, 100, 50);
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = Math.min(255, heatVal * 180);
        }
      }
    }
  }
  overlayCtx.putImageData(imageData, 0, 0);
  for (let i = 0; i < perturbState.heatMap.length; i++) {
    perturbState.heatMap[i] *= 0.97;
  }
}

function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function effectsAnimationLoop() {
  if (!overlayCtx || (!perturbState.fxAnneaux && !perturbState.fxFumee && !perturbState.fxChaleur)) {
    perturbState.animFrameId = null;
    return;
  }
  if (!state.config) {
    perturbState.animFrameId = null;
    return;
  }
  const cell = Number(state.config.rendu.taille_cellule || 5);
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (perturbState.fxChaleur) renderHeatMap(cell);
  if (perturbState.fxFumee) renderSmokeTrails();
  if (perturbState.fxAnneaux) renderGlowRings(cell);
  if (perturbState.anneaux.length > 0 || perturbState.particules.length > 0 || (perturbState.heatMap && perturbState.heatMap.some(v => v > 0.01))) {
    perturbState.animFrameId = requestAnimationFrame(effectsAnimationLoop);
  } else {
    perturbState.animFrameId = null;
  }
}

function startEffectsLoop() {
  if (perturbState.animFrameId) return;
  effectsAnimationLoop();
}

function handleCanvasPerturb(event) {
  if (!state.config || !state.universe) return;
  const rect = canvas.getBoundingClientRect();
  const cellSize = Number(state.config.rendu.taille_cellule || 5);
  const cx = Math.floor((event.clientX - rect.left) / cellSize);
  const cy = Math.floor((event.clientY - rect.top) / cellSize);
  if (cx < 0 || cy < 0 || cx >= state.config.largeur || cy >= state.config.hauteur) return;

  if (perturbState.toolActif === "inspecter") {
    const inspectEl = document.querySelector("#perturb-inspect-cell");
    if (inspectEl && state.universe.lignes[cy]) {
      const val = state.universe.lignes[cy][cx];
      inspectEl.textContent = `Cell [${cx}, ${cy}]\nValue: ${val}`;
    }
    return;
  }

  let typeMap = "pulse";
  if (perturbState.toolActif === "attirer") typeMap = "attirer";
  else if (perturbState.toolActif === "geler") typeMap = "geler";
  else if (perturbState.toolActif === "muter") typeMap = "muter";

  const evt = {
    cx, cy, rayon: perturbState.rayon, force: perturbState.force,
    type: typeMap, graine: Math.floor(Math.random() * 0x100000000), t: Date.now(),
  };
  perturbState.evenements.push(evt);
  if (perturbState.evenements.length > 24) perturbState.evenements.shift();

  const newUniverse = window.AutomaginariumCore.appliquerPerturbation(state.universe, evt);
  if (newUniverse) {
    state.universe = newUniverse;
    render();
    spawnGlowRing(cx, cy, perturbState.rayon);
    spawnSmokeTrail(cx, cy);
    updateHeatMap(cx, cy, perturbState.rayon, cellSize);
    startEffectsLoop();
  }
  renderPerturbQueue();
}

function renderPerturbQueue() {
  const queueDiv = document.querySelector("#perturb-event-queue");
  const countEl = document.querySelector("#perturb-queue-count");
  if (!queueDiv) return;
  if (countEl) countEl.textContent = String(perturbState.evenements.length);
  queueDiv.innerHTML = "";
  perturbState.evenements.slice(-8).reverse().forEach((evt) => {
    const item = document.createElement("div");
    item.className = "perturb-queue-item";
    const typeLabel = evt.type === "pulse" ? "Perturb" : evt.type === "effacer" ? "Effacer" : "Inverser";
    item.innerHTML = `<span class="perturb-queue-item-type">${typeLabel}</span><span>(${evt.cx},${evt.cy})</span>`;
    queueDiv.appendChild(item);
  });
}

const perturbControls = {
  toolBtns: [...document.querySelectorAll(".perturb-tool-btn")],
  typeSelect: document.querySelector("#perturb-type"),
  rayonSlider: document.querySelector("#perturb-rayon"),
  forceSlider: document.querySelector("#perturb-force"),
  gelDureeInput: document.querySelector("#perturb-gel-duree"),
  fxAnneaux: document.querySelector("#perturb-fx-anneaux"),
  fxFumee: document.querySelector("#perturb-fx-fumee"),
  fxChaleur: document.querySelector("#perturb-fx-chaleur"),
  clearQueue: document.querySelector("#perturb-clear-queue"),
};

perturbControls.toolBtns.forEach((btn) => {
  if (btn.dataset.tool === "inspecter") {
    btn.setAttribute("aria-pressed", "true");
  } else {
    btn.setAttribute("aria-pressed", "false");
  }
  btn.addEventListener("click", () => {
    perturbControls.toolBtns.forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    perturbState.toolActif = btn.dataset.tool;
  });
});

if (perturbControls.typeSelect) {
  perturbControls.typeSelect.addEventListener("change", (e) => {
    perturbState.type = e.target.value;
  });
}

if (perturbControls.rayonSlider) {
  perturbControls.rayonSlider.addEventListener("input", (e) => {
    perturbState.rayon = Number(e.target.value);
    const valSpan = document.querySelector("#perturb-rayon-val");
    if (valSpan) valSpan.textContent = e.target.value;
  });
}

if (perturbControls.forceSlider) {
  perturbControls.forceSlider.addEventListener("input", (e) => {
    perturbState.force = Number(e.target.value) / 10;
    const valSpan = document.querySelector("#perturb-force-val");
    if (valSpan) valSpan.textContent = (Number(e.target.value) / 10).toFixed(1);
  });
}

if (perturbControls.gelDureeInput) {
  perturbControls.gelDureeInput.addEventListener("input", (e) => {
    perturbState.gelDuree = Number(e.target.value);
  });
}

if (perturbControls.fxAnneaux) {
  perturbControls.fxAnneaux.addEventListener("change", (e) => {
    perturbState.fxAnneaux = e.target.checked;
  });
}

if (perturbControls.fxFumee) {
  perturbControls.fxFumee.addEventListener("change", (e) => {
    perturbState.fxFumee = e.target.checked;
  });
}

if (perturbControls.fxChaleur) {
  perturbControls.fxChaleur.addEventListener("change", (e) => {
    perturbState.fxChaleur = e.target.checked;
  });
}

if (perturbControls.clearQueue) {
  perturbControls.clearQueue.addEventListener("click", () => {
    perturbState.evenements = [];
    renderPerturbQueue();
  });
}

canvas.addEventListener("click", handleCanvasPerturb);

// CAROUSEL NAVIGATION
const carouselGallery = document.querySelector("#preset-gallery");
const carouselPrevBtn = document.querySelector("#carousel-prev");
const carouselNextBtn = document.querySelector("#carousel-next");

if (carouselGallery && carouselPrevBtn && carouselNextBtn) {
  const scrollAmount = 260; // Card width + gap

  carouselPrevBtn.addEventListener("click", () => {
    carouselGallery.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  });

  carouselNextBtn.addEventListener("click", () => {
    carouselGallery.scrollBy({ left: scrollAmount, behavior: "smooth" });
  });

  // Update preset card active state when clicked
  carouselGallery.querySelectorAll(".preset-card").forEach((card) => {
    card.addEventListener("click", function() {
      carouselGallery.querySelectorAll(".preset-card").forEach(c => c.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

setSyncState("pending", "Initialisation du laboratoire...");
await loadPreset("wolfram-90");
initOverlayCanvas();
if (state.config) resizeOverlayCanvas(state.config);
