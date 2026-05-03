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
  if (ruleMode === "totalistique") value = `Tot(${neighborhood})`;
  else if (ruleMode === "aleatoire") value = `Alea(${neighborhood})`;
  else if (ruleMode === "numerique") value = `R${neighborhood}x${channels}`;
  else if (neighborhood !== 3 || channels !== 1) value = `T${neighborhood}x${channels}`;
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

function applyConfig(config, { source = "Configuration" } = {}) {
  const normalized = window.AutomaginariumCore.normaliserConfiguration(config);
  const validation = validateConfig(normalized);
  showStatus(validation);
  if (!validation.valid) {
    setSyncState("error", `Correction requise: ${validation.errors[0] || "configuration invalide"}`);
    return false;
  }
  state.config = normalized;
  state.lastValidConfig = structuredClone(normalized);
  state.universe = window.AutomaginariumCore.genererUnivers(normalized);
  syncControls(normalized);
  describe(normalized);
  updateRuleSpaceDisplay(normalized);
  updatePaletteEditor();
  updateHudRule();
  render();
  setSyncState("ok", `${source} chargee`);
  return true;
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
