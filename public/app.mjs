import { installAutomaginariumPacked } from "./generated/automate_packed_runtime.mjs";

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
const featureModules = {
  genetic: null,
  perturb: null,
};

async function ensureFeatureModule(name) {
  if (featureModules[name]) return featureModules[name];
  if (name === "genetic") {
    const { initializeGeneticWorkbench } = await import("./features/genetic-workbench.mjs");
    featureModules[name] = initializeGeneticWorkbench({
      getConfig: () => state.config,
      applyConfig,
    });
    return featureModules[name];
  }
  if (name === "perturb") {
    const { initializePerturbationToolkit } = await import("./features/perturbation-toolkit.mjs");
    featureModules[name] = initializePerturbationToolkit({
      canvas,
      getConfig: () => state.config,
      getUniverse: () => state.universe,
      setUniverse: (universe) => {
        state.universe = universe;
      },
      render,
    });
    if (state.config && typeof featureModules[name].onConfigApplied === "function") {
      featureModules[name].onConfigApplied(state.config);
    }
    return featureModules[name];
  }
  return null;
}

function setActiveInspectorPanel(panelId) {
  inspectorTabs.forEach((tab) => {
    const active = tab.dataset.panel === panelId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  inspectorPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });
  if (panelId === "genetic-panel") {
    void ensureFeatureModule("genetic");
  }
  if (panelId === "perturb-panel") {
    void ensureFeatureModule("perturb");
  }
}

function controlsToConfig() {
  return window.AutomaginariumCore.formStateToConfig({
    name: controls.name.value,
    alphabetInput: controls.alphabetInput.value,
    alphabetOutput: controls.alphabetOutput.value,
    neighborhood: controls.neighborhood.value,
    channels: controls.channels.value,
    width: controls.width.value,
    height: controls.height.value,
    boundary: controls.boundary.value,
    initialMode: controls.initialMode.value,
    initialValues: controls.initialValues.value,
    initialProbability: controls.initialProbability.value,
    cellSize: controls.cellSize.value,
    ruleMode: controls.ruleMode.value,
    ruleNumber: controls.ruleNumber.value,
  }, state.config || {});
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
  const formState = window.AutomaginariumCore.configToFormState(config);
  controls.name.value = formState.name;
  controls.alphabetInput.value = formState.alphabetInput;
  controls.alphabetOutput.value = formState.alphabetOutput;
  controls.neighborhood.value = formState.neighborhood;
  controls.channels.value = formState.channels;
  controls.width.value = formState.width;
  controls.height.value = formState.height;
  controls.boundary.value = formState.boundary;
  controls.initialMode.value = formState.initialMode;
  controls.initialValues.value = formState.initialValues;
  controls.initialProbability.value = formState.initialProbability;
  controls.cellSize.value = formState.cellSize;
  controls.ruleMode.value = formState.ruleMode;
  controls.ruleNumber.value = formState.ruleNumber;
  controls.json.value = formState.json;
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

function renderTransitionSignals(config) {
  if (!transitionSignals) return;
  const entries = window.AutomaginariumCore.transitionSignalEntries(config, 6);
  transitionSignals.innerHTML = "";
  entries.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "transition-signal-card";
    card.innerHTML = `<span class="transition-signal-label">${entry.label}</span><strong>${entry.title}</strong><p>${entry.body}</p>`;
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
  document.querySelector("#hud-rule").textContent = window.AutomaginariumCore.hudRuleLabel({
    neighborhood: controls.neighborhood.value,
    channels: controls.channels.value,
    ruleMode: controls.ruleMode.value,
    wolframRule: controls.wolframRule.value,
  });
}

function updateHudMetrics(universe) {
  const metrics = window.AutomaginariumCore.universeHudMetrics(universe);
  document.querySelector("#hud-gen").textContent = String(metrics.generations);
  document.querySelector("#hud-density").textContent = `${metrics.density}%`;
  document.querySelector("#hud-entropy").textContent = metrics.entropy.toFixed(2);
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
  if (featureModules.perturb && typeof featureModules.perturb.onConfigApplied === "function") {
    featureModules.perturb.onConfigApplied(configuration);
  }
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
  if (featureModules.perturb && typeof featureModules.perturb.onConfigApplied === "function") {
    featureModules.perturb.onConfigApplied(configuration);
  }
}

function describe(config) {
  const description = window.AutomaginariumCore.describeConfiguration(config);
  title.textContent = description.title;
  meta.textContent = description.metaText;
  tableView.innerHTML = description.ruleTableHtml;
  ruleDetailView.innerHTML = description.ruleTableHtml;
  renderTransitionSignals(config);
  if (universeLiveSummary) {
    universeLiveSummary.innerHTML = `<span class="live-summary-label">Projection</span><strong>${window.AutomaginariumCore.summarizeConfig(config)}</strong>`;
  }
  if (transitionLiveSummary) {
    transitionLiveSummary.innerHTML = `<span class="live-summary-label">Reponse</span><strong>${window.AutomaginariumCore.summarizeTransition(config)}</strong>`;
  }
}

function updateRuleSpaceDisplay(config) {
  controls.ruleSpaceSize.textContent = window.AutomaginariumCore.ruleSpaceLabel(config);
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
    const normalized = window.AutomaginariumCore.ensureRenderableConfiguration(config);
    const validation = validateConfig(normalized);
    showStatus(validation);
    if (!validation.valid) {
      setSyncState("error", `Correction requise: ${validation.errors[0] || "configuration invalide"}`);
      return false;
    }
    state.config = normalized;
    state.lastValidConfig = structuredClone(normalized);
    state.universe = window.AutomaginariumCore.genererUnivers(normalized);
    if (!state.universe || !state.universe.lignes || state.universe.lignes.length === 0) {
      setSyncState("error", "Erreur: univers vide généré");
      return false;
    }
    syncControls(normalized);
    describe(normalized);
    updateRuleSpaceDisplay(normalized);
    updatePaletteEditor();
    updateHudRule();
    render();
    setSyncState("ok", `${source} chargee`);
    return true;
  } catch (error) {
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
  const built = window.AutomaginariumCore.buildGeneratedRuleConfig(
    controlsToConfig(),
    controls.ruleGenerator.value,
    controls.wolframRule.value,
  );
  controls.ruleGenerator.value = built.effectiveGenerator;
  return built.config;
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
  controls.ruleNumber.value = window.AutomaginariumCore.randomRuleNumber(maxRule).toString();
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
