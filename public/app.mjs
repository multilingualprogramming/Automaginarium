import { installAutomaginariumPacked } from "./generated/automate_packed_runtime.mjs";

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
const gallery = document.querySelector("#preset-gallery");
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
  ruleGenerator: document.querySelector("#rule-generator"),
  json: document.querySelector("#config-json"),
  importJson: document.querySelector("#import-json"),
};
const presetCache = new Map();

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

function allNeighborhoodKeys(alphabet, size) {
  return window.AutomaginariumCore.toutesClesVoisinage(alphabet, size);
}

function parseNeighborhoodKey(key) {
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) ? parsed : key.split("");
  } catch (error) {
    return key.split("");
  }
}

function randomOutput(config) {
  return Array.from(
    { length: config.nombre_canaux_sortie },
    () => config.alphabet_sortie[Math.floor(Math.random() * config.alphabet_sortie.length)],
  );
}

function generateRandomTable(config) {
  return Object.fromEntries(allNeighborhoodKeys(config.alphabet_entree, config.taille_voisinage).map((key) => [key, randomOutput(config)]));
}

function generateSymmetricTable(config) {
  const table = {};
  allNeighborhoodKeys(config.alphabet_entree, config.taille_voisinage).forEach((key) => {
    const mirror = JSON.stringify(parseNeighborhoodKey(key).reverse());
    if (table[key]) return;
    const output = randomOutput(config);
    table[key] = output;
    table[mirror] = output;
  });
  return table;
}

function generateTotalisticTable(config) {
  return Object.fromEntries(allNeighborhoodKeys(config.alphabet_entree, config.taille_voisinage).map((key) => {
    const sum = parseNeighborhoodKey(key).reduce((acc, value) => acc + Number(value), 0);
    const index = Number.isFinite(sum) ? Math.abs(sum) % config.alphabet_sortie.length : key.length % config.alphabet_sortie.length;
    return [key, Array.from({ length: config.nombre_canaux_sortie }, (_, channel) => config.alphabet_sortie[(index + channel) % config.alphabet_sortie.length])];
  }));
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
    etat_initial: { mode: initialMode },
    rendu: { ...(current.rendu || {}), taille_cellule: Math.max(1, Number(controls.cellSize.value || 5)) },
  };
  if (initialMode === "motif") config.etat_initial.valeurs = parseList(controls.initialValues.value, [outputAlphabet[1] ?? outputAlphabet[0]]);
  if (initialMode === "aleatoire") {
    config.etat_initial.graine = current.etat_initial?.graine ?? 42;
    config.etat_initial.probabilite = Math.max(0, Math.min(1, Number(controls.initialProbability.value || 0.28)));
  }
  if (!config.table_transition) config.table_transition = {};
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
  controls.json.value = JSON.stringify(config, null, 2);
}

// Interpolate between two hex colors
function interpolateColor(color1, color2, factor) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Get color from gradient at a given position (0-1)
function getGradientColor(position, colors, positions) {
  if (!colors || colors.length === 0) return '#ffffff';
  if (colors.length === 1) return colors[0];

  // Normalize position to 0-1
  const t = Math.max(0, Math.min(1, position));

  // Find the two stops this position falls between
  let startIdx = 0;
  for (let i = 0; i < positions.length - 1; i++) {
    const pos1 = positions[i] / 100;
    const pos2 = positions[i + 1] / 100;
    if (t >= pos1 && t <= pos2) {
      startIdx = i;
      break;
    }
  }

  const pos1 = positions[startIdx] / 100;
  const pos2 = positions[startIdx + 1] / 100;
  const range = pos2 - pos1;
  const factor = range === 0 ? 0 : (t - pos1) / range;

  return interpolateColor(colors[startIdx], colors[startIdx + 1], factor);
}

function colorFor(value, config, rowIndex, colIndex, channels) {
  const visualValue = channels && channels.length > 1 ? channels[1] : value;
  const alphabet = config.alphabet_sortie || config.alphabet_entree || [0, 1];
  let index = alphabet.findIndex((item) => String(item) === String(visualValue));

  // Use gradient if available
  const gradient = config.rendu.gradient;
  if (gradient && gradient.colors && gradient.colors.length > 0) {
    let position = 0;
    if (index >= 0) {
      position = index / Math.max(1, alphabet.length - 1);
    } else {
      position = (Math.abs(Number(visualValue) || Number(value) || 0) % 100) / 100;
    }

    // Apply gradient based on type
    if (gradient.type === 'linear') {
      position = (colIndex / (config.largeur || 100)) * 0.5 + (rowIndex / (config.hauteur || 100)) * 0.5;
    } else if (gradient.type === 'radial') {
      const centerX = (config.largeur || 100) / 2;
      const centerY = (config.hauteur || 100) / 2;
      const dist = Math.sqrt(Math.pow(colIndex - centerX, 2) + Math.pow(rowIndex - centerY, 2));
      const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
      position = Math.min(1, dist / maxDist);
    } else if (gradient.type === 'conic') {
      const centerX = (config.largeur || 100) / 2;
      const centerY = (config.hauteur || 100) / 2;
      const angle = Math.atan2(rowIndex - centerY, colIndex - centerX);
      position = ((angle + Math.PI) / (2 * Math.PI));
    }

    return getGradientColor(position, gradient.colors, gradient.positions);
  }

  // Fallback to palette if no gradient
  const palette = config.rendu.palette || ["#07121f", "#ff9d4d", "#53b0ff", "#f5f7ff"];
  if (index < 0) index = Math.abs(Number(visualValue) || Number(value) || 0) % palette.length;
  const drift = (rowIndex + colIndex) % Math.max(1, palette.length - 1);
  return palette[(index + drift) % palette.length] || palette[0];
}

window.applyGradientToPalette = function(colors, type, positions) {
  if (!state.config) return;
  state.config.rendu = state.config.rendu || {};
  state.config.rendu.gradient = {
    colors: colors || ["#07121f", "#ff9d4d", "#53b0ff", "#f5f7ff"],
    type: type || 'linear',
    positions: positions || [0, 50, 100]
  };
  // Keep palette as fallback
  state.config.rendu.palette = colors || ["#07121f", "#ff9d4d", "#53b0ff", "#f5f7ff"];
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
      if (String(value) === String(configuration.alphabet_entree[0]) && !configuration.rendu.afficher_zero) return;
      context.fillStyle = colorFor(value, configuration, y, x, sorties?.[y]?.[x]);
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
      if (String(value) === String(configuration.alphabet_entree[0]) && !configuration.rendu.afficher_zero) return;
      ctx.fillStyle = colorFor(value, configuration, y, x, sorties?.[y]?.[x]);
      ctx.fillRect(x * cell, y * cell, cell, cell);
    });
  });
}

function describe(config) {
  title.textContent = config.nom;
  meta.textContent = `${config.alphabet_entree.length} symbole(s) entree | ${config.alphabet_sortie.length} sortie | voisinage ${config.taille_voisinage} | ${config.nombre_canaux_sortie} canal(aux) | ${config.mode_regle}`;
  const entries = Object.entries(config.table_transition || {}).slice(0, 24);
  tableView.innerHTML = entries.length > 0
    ? entries.map(([key, value]) => `<span><b>${key}</b> -> ${JSON.stringify(value)}</span>`).join("")
    : `<span><b>${config.mode_regle}</b> -> genere par le noyau</span>`;
}

function applyConfig(config, { updateJson = true, updateControls = true } = {}) {
  const normalized = window.AutomaginariumCore.normaliserConfiguration(config);
  const validation = validateConfig(normalized);
  showStatus(validation);
  if (!validation.valid) return false;
  state.config = normalized;
  state.lastValidConfig = structuredClone(normalized);
  state.universe = window.AutomaginariumCore.genererUnivers(normalized);
  if (updateControls) syncControls(normalized);
  if (updateJson) controls.json.value = JSON.stringify(normalized, null, 2);
  describe(normalized);
  render();
  return true;
}

async function loadPreset(id) {
  const config = await fetchPreset(id);
  applyConfig(config);
}

async function fetchPreset(id) {
  if (presetCache.has(id)) return structuredClone(presetCache.get(id));
  const response = await fetch(`../examples/${id}.json`);
  if (!response.ok) throw new Error(`Preset introuvable: ${id}`);
  const config = await response.json();
  presetCache.set(id, config);
  return structuredClone(config);
}

function applyGeneratedRule() {
  const config = window.AutomaginariumCore.normaliserConfiguration(controlsToConfig());
  const generator = controls.ruleGenerator.value;
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
  applyConfig(config);
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

presetSelect.addEventListener("change", () => loadPreset(presetSelect.value));
document.querySelector("#apply-controls").addEventListener("click", () => applyConfig(controlsToConfig()));
document.querySelector("#generate-rule").addEventListener("click", applyGeneratedRule);
document.querySelector("#apply-json").addEventListener("click", () => {
  try {
    applyConfig(JSON.parse(controls.json.value), { updateJson: true, updateControls: true });
  } catch (error) {
    showStatus({ valid: false, errors: [`JSON invalide: ${error.message}`], warnings: [] });
  }
});
document.querySelector("#reset-json").addEventListener("click", () => {
  controls.json.value = JSON.stringify(state.lastValidConfig || state.config, null, 2);
});
controls.importJson.addEventListener("change", async () => {
  const file = controls.importJson.files[0];
  if (!file) return;
  try {
    applyConfig(JSON.parse(await file.text()));
  } catch (error) {
    showStatus({ valid: false, errors: [`Import impossible: ${error.message}`], warnings: [] });
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

await renderGallery();
loadPreset("wolfram-90");
