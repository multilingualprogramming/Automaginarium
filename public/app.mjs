import { installAutomaginariumPacked } from "./generated/automate_packed_runtime.mjs";
import { generateRandomTable, generateSymmetricTable, generateTotalisticTable } from "./rule-generation.mjs";

await installAutomaginariumPacked();

const PRESETS = [
  { id: "wolfram-30", label: "Wolfram 30", family: "elementaire" },
  { id: "wolfram-90", label: "Wolfram 90", family: "elementaire" },
  { id: "wolfram-110", label: "Wolfram 110", family: "elementaire" },
  { id: "binaire-5-sillage", label: "Binaire 5 - Sillage", family: "voisinage 5" },
  { id: "ternaire-totalistique", label: "Ternaire totalistique", family: "ternaire" },
  { id: "quaternaire-cristal", label: "Quaternaire cristal", family: "quaternaire" },
  { id: "multi-canal-aurore", label: "Multi-canal Aurore", family: "multi-canal" },
  { id: "symboles-jardin", label: "Symboles jardin", family: "custom" },
];

const state = { config: null, universe: null, lastValidConfig: null };
const canvas = document.querySelector("#universe");
const ctx = canvas.getContext("2d");
const presetSelect = document.querySelector("#preset");
const title = document.querySelector("#config-title");
const meta = document.querySelector("#config-meta");
const statusBox = document.querySelector("#validation-status");
const tableView = document.querySelector("#rule-table");
const ruleDetailView = document.querySelector("#rule-table-detail");
const gallery = document.querySelector("#preset-gallery");
const liveModeText = document.querySelector("#live-mode-text");
const liveImpactText = document.querySelector("#live-impact-text");
const livePreviewBadge = document.querySelector("#live-preview-badge");
const livePreviewOrigin = document.querySelector("#live-preview-origin");
const livePreviewSummary = document.querySelector("#live-preview-summary");
const syncIndicatorDot = document.querySelector("#sync-indicator-dot");
const syncIndicatorText = document.querySelector("#sync-indicator-text");
const universeLiveSummary = document.querySelector("#universe-live-summary");
const transitionLiveSummary = document.querySelector("#transition-live-summary");
const transitionSignals = document.querySelector("#transition-signals");
const controls = {
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
const presetCache = new Map();
const liveFieldControls = [
  controls.name,
  controls.alphabetInput,
  controls.alphabetOutput,
  controls.neighborhood,
  controls.channels,
  controls.width,
  controls.height,
  controls.boundary,
  controls.initialMode,
  controls.initialValues,
  controls.initialProbability,
  controls.cellSize,
];
const liveRuleControls = [
  controls.ruleMode,
  controls.wolframRule,
  controls.ruleNumber,
  controls.ruleGenerator,
];

let previewTimer = null;
let lastPreviewSource = "Initialisation";

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


// Rule generation moved to rule-generation.mjs
// These functions are temporary and will eventually call compiled ML functions.
// See rule-generation.mjs for details.

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
  if (initialMode === "motif") config.etat_initial.valeurs = parseList(controls.initialValues.value, [outputAlphabet[1] ?? outputAlphabet[0]]);
  if (initialMode === "aleatoire") {
    config.etat_initial.graine = current.etat_initial?.graine ?? 42;
    config.etat_initial.probabilite = Math.max(0, Math.min(1, Number(controls.initialProbability.value || 0.28)));
  }
  // Clear transition table if alphabet has changed (otherwise table keys won't match new alphabet)
  const alphabetChanged = current.alphabet_entree && (current.alphabet_entree.length !== inputAlphabet.length || current.taille_voisinage !== neighborhood);
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
      ? [`${result.avertissements.length} avertissement(s); voir la table ou le JSON pour details.`]
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
  controls.ruleNumber.value = (config.numero_regle ? String(config.numero_regle) : "0");
  // Convert BigInt to string for JSON serialization
  const configForJson = { ...config, numero_regle: String(config.numero_regle || 0n) };
  controls.json.value = JSON.stringify(configForJson, null, 2);
  window.AutomaginariumUI?.syncQuickControls?.();
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
    Array.from({ length: alphabetSize }, (_, i) => {
      const hue = (i / alphabetSize) * 360;
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
    return `Mode totalistique avec ${config.alphabet_sortie.length} etat(s) de sortie distribues par somme de voisinage.`;
  }
  if (entries.length === 0) {
    return `Mode ${config.mode_regle} pilote par le noyau sans table explicite exposee.`;
  }
  return `${entries.length} transition(s) actives dans la table en cours.`;
}

function setSyncState(kind, text) {
  syncIndicatorDot.dataset.state = kind;
  syncIndicatorText.textContent = text;
  const heroDot = document.querySelector("#hero-sync-dot");
  const heroText = document.querySelector("#hero-status-text");
  if (heroDot) heroDot.dataset.state = kind;
  if (heroText) heroText.textContent = text;
  if (livePreviewBadge) livePreviewBadge.textContent = kind === "error" ? "Validation" : kind === "pending" ? "Projection..." : "Apercu live";
  if (liveModeText) liveModeText.textContent = kind === "error" ? "Correction requise" : kind === "pending" ? "Recomposition en cours" : "Apercu temps reel actif";
}

function updateLiveNarrative(config, source, live) {
  const sourceLabel = source || "Configuration";
  const liveLabel = live ? "Projection immediate" : "Synchronisation";
  if (livePreviewOrigin) livePreviewOrigin.textContent = `${liveLabel} depuis ${sourceLabel}`;
  if (livePreviewSummary) livePreviewSummary.textContent = `${summarizeConfig(config)}. ${summarizeTransition(config)}`;
  if (liveImpactText) liveImpactText.textContent = `Impact direct: ${config.mode_regle} sur ${config.largeur} x ${config.hauteur}`;
  if (universeLiveSummary) universeLiveSummary.innerHTML = `<span class="live-summary-label">Projection</span><strong>${summarizeConfig(config)}</strong>`;
  if (transitionLiveSummary) transitionLiveSummary.innerHTML = `<span class="live-summary-label">Reponse</span><strong>${summarizeTransition(config)}</strong>`;
}

function renderTransitionSignals(config) {
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
    card.innerHTML = `
      <span class="transition-signal-label">Transition ${index + 1}</span>
      <strong>${key}</strong>
      <p>${JSON.stringify(value)}</p>
    `;
    transitionSignals.appendChild(card);
  });
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
    const p = count / totalCells;
    entropy -= p > 0 ? p * Math.log2(p) : 0;
  });
  document.querySelector("#hud-gen").textContent = String(configuration.hauteur);
  document.querySelector("#hud-density").textContent = `${density}%`;
  document.querySelector("#hud-entropy").textContent = entropy.toFixed(2);
}

window.setPaletteColor = function(alphabetIndex, color) {
  if (!state.config) return;
  state.config.rendu = state.config.rendu || {};
  const alphabet = state.config.alphabet_sortie || state.config.alphabet_entree || [0, 1];
  if (!state.config.rendu.palette) {
    state.config.rendu.palette = getDefaultPalette(alphabet.length);
  }
  state.config.rendu.palette[alphabetIndex] = color;
  render();
};

function drawUniverseToCanvas(targetCanvas, universe, maxWidth = 240, maxHeight = 132) {
  const { configuration, lignes, sorties } = universe;
  const context = targetCanvas.getContext("2d");
  const cell = Math.max(1, Math.floor(Math.min(maxWidth / configuration.largeur, maxHeight / configuration.hauteur)));
  targetCanvas.width = configuration.largeur * cell;
  targetCanvas.height = configuration.hauteur * cell;
  context.fillStyle = configuration.rendu.fond || "#05070d";
  context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  lignes.forEach((ligne, y) => {
    ligne.forEach((value, x) => {
      const channels = sorties?.[y]?.[x];
      const visualValue = channels && channels.length > 1 ? channels[1] : value;
      const bgValue = configuration.alphabet_sortie?.[0] ?? configuration.alphabet_entree[0];
      if (!configuration.rendu.afficher_zero && String(visualValue) === String(bgValue)) return;
      context.fillStyle = colorFor(value, configuration, channels);
      context.fillRect(x * cell, y * cell, cell, cell);
    });
  });
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
  lignes.forEach((ligne, y) => {
    ligne.forEach((value, x) => {
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
}

function updateRuleSpaceDisplay(config) {
  const { s, k, t, m, maxRule } = window.AutomaginariumCore.ruleConfiguration(config);
  const ruleSpaceText = `${t}^(${m}·${s}^${k}) = ${maxRule} règles possibles`;
  if (controls.ruleSpaceSize) controls.ruleSpaceSize.textContent = ruleSpaceText;
  const quickRuleSpace = document.querySelector("#rule-space-size-quick");
  if (quickRuleSpace) quickRuleSpace.textContent = ruleSpaceText;
}

function applyConfig(config, { updateJson = true, updateControls = true, source = "Synchronisation", live = false } = {}) {
  const normalized = window.AutomaginariumCore.normaliserConfiguration(config);
  const validation = validateConfig(normalized);
  showStatus(validation);
  if (!validation.valid) {
    setSyncState("error", `Correction requise: ${validation.errors[0] || "configuration invalide"}`);
    if (livePreviewOrigin) livePreviewOrigin.textContent = `Validation depuis ${source}`;
    if (livePreviewSummary) livePreviewSummary.textContent = validation.errors.join(" ");
    return false;
  }
  state.config = normalized;
  state.lastValidConfig = structuredClone(normalized);
  state.universe = window.AutomaginariumCore.genererUnivers(normalized);
  if (updateControls) syncControls(normalized);
  if (updateJson) {
    // Convert BigInt to string for JSON serialization
    const configForJson = { ...normalized, numero_regle: String(normalized.numero_regle || 0n) };
    controls.json.value = JSON.stringify(configForJson, null, 2);
  }
  describe(normalized);
  updateRuleSpaceDisplay(normalized);
  render();
  updateLiveNarrative(normalized, source, live);
  setSyncState("ok", live ? "Synchronisation live active" : "Configuration synchronisee");
  window.AutomaginariumUI?.updateHudRule?.();
  window.AutomaginariumUI?.updatePaletteEditor?.();
  return true;
}

async function loadPreset(id) {
  const config = await fetchPreset(id);
  applyConfig(config, { updateJson: true, updateControls: true, source: `Preset ${id}`, live: false });
}

async function fetchPreset(id) {
  if (presetCache.has(id)) return structuredClone(presetCache.get(id));
  const response = await fetch(`../examples/${id}.json`);
  if (!response.ok) throw new Error(`Preset introuvable: ${id}`);
  const config = await response.json();
  presetCache.set(id, config);
  return structuredClone(config);
}

function buildGeneratedRuleConfig() {
  const config = window.AutomaginariumCore.normaliserConfiguration(controlsToConfig());
  let generator = controls.ruleGenerator.value;

  // Wolfram only works with neighborhood 3, binary alphabet, and 1 output channel
  const isBinaryAlphabet = config.alphabet_entree.length === 2 && String(config.alphabet_entree[0]) === "0" && String(config.alphabet_entree[1]) === "1";
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

function applyGeneratedRule({ updateJson = true, updateControls = true, source = "Regles", live = false } = {}) {
  return applyConfig(buildGeneratedRuleConfig(), { updateJson, updateControls, source, live });
}

function queuePreview(action, delay = 180) {
  clearTimeout(previewTimer);
  setSyncState("pending", "Projection en cours...");
  previewTimer = window.setTimeout(action, delay);
}

function queueConfigPreview(source = "Parametres") {
  lastPreviewSource = source;
  queuePreview(() => {
    // Auto-sync output alphabet to input alphabet if output was empty or matching old input
    const oldOutputValue = controls.alphabetOutput.value.trim();
    const oldInputValue = state.config ? encodeList(state.config.alphabet_entree) : "";
    if (!oldOutputValue || oldOutputValue === oldInputValue) {
      // Output alphabet was following input, so update it
      controls.alphabetOutput.value = controls.alphabetInput.value;
    }

    const newConfig = controlsToConfig();
    const oldAlphabet = state.config?.alphabet_entree;
    const newAlphabet = newConfig.alphabet_entree;
    const alphabetChanged = oldAlphabet && (
      oldAlphabet.length !== newAlphabet.length ||
      state.config?.taille_voisinage !== newConfig.taille_voisinage ||
      state.config?.nombre_canaux_sortie !== newConfig.nombre_canaux_sortie
    );
    applyConfig(newConfig, { updateJson: false, updateControls: false, source, live: true });
    if (alphabetChanged) {
      setTimeout(() => applyGeneratedRule({ updateJson: false, updateControls: true, source: "Regles (auto)", live: true }), 50);
    }
  });
}

function queueRulePreview(source = "Regles") {
  lastPreviewSource = source;
  queuePreview(() => {
    applyGeneratedRule({ updateJson: false, updateControls: true, source, live: true });
  });
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

async function renderGallery() {
  gallery.innerHTML = "";
  for (const preset of PRESETS) {
    const config = await fetchPreset(preset.id);
    const previewConfig = {
      ...config,
      largeur: Math.min(config.largeur || 140, 140),
      hauteur: Math.min(config.hauteur || 80, 80),
      rendu: { ...(config.rendu || {}), taille_cellule: 2 },
    };
    const universe = window.AutomaginariumCore.genererUnivers(previewConfig);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-card";
    button.dataset.preset = preset.id;

    const thumbnail = document.createElement("canvas");
    thumbnail.className = "preset-thumb";
    drawUniverseToCanvas(thumbnail, universe);

    const name = document.createElement("strong");
    name.textContent = preset.label;
    const family = document.createElement("span");
    family.textContent = preset.family;

    button.append(thumbnail, name, family);
    button.addEventListener("click", () => {
      presetSelect.value = preset.id;
      loadPreset(preset.id);
    });
    gallery.appendChild(button);
  }
}

PRESETS.forEach((preset) => {
  const option = document.createElement("option");
  option.value = preset.id;
  option.textContent = preset.label;
  presetSelect.appendChild(option);
});

function randomBigInt(max) {
  const bits = max.toString(2).length;
  const words = Math.ceil(bits / 32) + 1;
  const rng = AutomaginariumCore.mulberry32(Date.now() >>> 0);
  let n = 0n;
  for (let i = 0; i < words; i += 1) {
    n = (n << 32n) | BigInt(Math.floor(rng() * 0x100000000));
  }
  return n % max;
}

liveFieldControls.forEach((control) => {
  control.addEventListener("input", () => queueConfigPreview("Parametres"));
  control.addEventListener("change", () => queueConfigPreview("Parametres"));
});

liveRuleControls.forEach((control) => {
  control.addEventListener("input", () => queueRulePreview("Regles"));
  control.addEventListener("change", () => queueRulePreview("Regles"));
});

presetSelect.addEventListener("change", () => loadPreset(presetSelect.value));
document.querySelector("#apply-controls").addEventListener("click", () => {
  clearTimeout(previewTimer);
  if (lastPreviewSource === "Regles") {
    applyGeneratedRule({ updateJson: true, updateControls: true, source: "Synchronisation manuelle", live: false });
  } else {
    applyConfig(controlsToConfig(), { updateJson: true, updateControls: true, source: "Synchronisation manuelle", live: false });
  }
});
document.querySelector("#generate-rule").addEventListener("click", () => {
  clearTimeout(previewTimer);
  applyGeneratedRule({ updateJson: true, updateControls: true, source: "Regles", live: false });
});
document.querySelector("#random-rule").addEventListener("click", () => {
  clearTimeout(previewTimer);
  const config = AutomaginariumCore.normaliserConfiguration(controlsToConfig());
  const { maxRule } = AutomaginariumCore.ruleConfiguration(config);
  controls.ruleNumber.value = randomBigInt(maxRule).toString();
  controls.ruleMode.value = "numerique";
  applyConfig(controlsToConfig(), { updateJson: true, updateControls: true, source: "Aléatoire", live: false });
});
document.querySelector("#apply-json").addEventListener("click", () => {
  try {
    clearTimeout(previewTimer);
    applyConfig(JSON.parse(controls.json.value), { updateJson: true, updateControls: true, source: "JSON", live: false });
  } catch (error) {
    showStatus({ valid: false, errors: [`JSON invalide: ${error.message}`], warnings: [] });
    setSyncState("error", "JSON invalide");
  }
});
document.querySelector("#reset-json").addEventListener("click", () => {
  controls.json.value = JSON.stringify(state.lastValidConfig || state.config, null, 2);
});

window.AutomaginariumApp = {
  state,
  render,
  getDefaultPalette,
  setPaletteColor,
};

controls.importJson.addEventListener("change", async () => {
  const file = controls.importJson.files[0];
  if (!file) return;
  try {
    clearTimeout(previewTimer);
    applyConfig(JSON.parse(await file.text()), { updateJson: true, updateControls: true, source: "Import JSON", live: false });
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
document.querySelector("#refresh-gallery").addEventListener("click", renderGallery);

setSyncState("pending", "Initialisation du laboratoire...");
await renderGallery();
await loadPreset("wolfram-90");
