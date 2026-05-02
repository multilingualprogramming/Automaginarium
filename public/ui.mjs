const syncPairs = [
  ["alphabet-input-quick", "alphabet-input"],
  ["neighborhood-size-quick", "neighborhood-size"],
  ["channel-count-quick", "channel-count"],
  ["grid-width-quick", "grid-width"],
  ["grid-height-quick", "grid-height"],
  ["rule-mode-quick", "rule-mode"],
  ["wolfram-rule-quick", "wolfram-rule"],
  ["rule-number-quick", "rule-number"],
];

function byId(id) {
  return document.getElementById(id);
}

function syncQuickControls() {
  syncPairs.forEach(([quickId, mainId]) => {
    const quick = byId(quickId);
    const main = byId(mainId);
    if (quick && main) quick.value = main.value;
  });
}

function updateHudRule() {
  const neighborhood = Number(byId("neighborhood-size")?.value || byId("neighborhood-size-quick")?.value || 3);
  const channels = Number(byId("channel-count")?.value || byId("channel-count-quick")?.value || 1);
  const ruleMode = byId("rule-mode")?.value || byId("rule-mode-quick")?.value || "table";
  const wolframRule = byId("wolfram-rule")?.value || byId("wolfram-rule-quick")?.value || "90";

  let value = wolframRule;
  if (ruleMode === "totalistique") value = `Tot(${neighborhood})`;
  else if (ruleMode === "aleatoire") value = `Alea(${neighborhood})`;
  else if (ruleMode === "numerique") value = `R${neighborhood}x${channels}`;
  else if (neighborhood !== 3 || channels !== 1) value = `T${neighborhood}x${channels}`;

  byId("hud-rule").textContent = value;
}

function updatePaletteButtons(palette) {
  document.querySelectorAll(".palette-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.palette === palette);
  });
}

function updatePaletteEditor() {
  const app = window.AutomaginariumApp;
  const editor = byId("palette-editor");
  if (!app?.state?.config || !editor) return;

  const config = app.state.config;
  const alphabet = config.alphabet_sortie || config.alphabet_entree || [0, 1];
  const palette = config.rendu.palette || app.getDefaultPalette(alphabet.length);
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
      app.setPaletteColor(index, event.target.value);
    });

    row.append(label, input);
    editor.appendChild(row);
  });
}

function setupInspectorTabs() {
  const buttons = [...document.querySelectorAll(".inspector-tab-btn")];
  const panels = [...document.querySelectorAll(".inspector-panel")];
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      panels.forEach((panel) => panel.classList.toggle("active", panel.id === `${button.dataset.panel}-panel`));
    });
  });
}

function setWorkspaceView(view) {
  const showGallery = view === "gallery";
  byId("main-panel").style.display = showGallery ? "none" : "grid";
  byId("gallery-panel").style.display = "block";
  document.querySelector(".config-lab").style.display = showGallery ? "none" : "grid";
}

function setupTopTabs() {
  const buttons = [...document.querySelectorAll(".tab")];
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      setWorkspaceView(button.id === "tab-gallery" ? "gallery" : "workspace");
    });
  });
  setWorkspaceView("workspace");
}

function setupPaletteButtons() {
  const savedPalette = localStorage.getItem("palette-preference") || "cosmic";
  document.documentElement.setAttribute("data-palette", savedPalette);
  updatePaletteButtons(savedPalette);

  document.querySelectorAll(".palette-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const palette = button.dataset.palette;
      document.documentElement.setAttribute("data-palette", palette);
      localStorage.setItem("palette-preference", palette);
      updatePaletteButtons(palette);
      updatePaletteEditor();
      window.AutomaginariumApp?.render?.();
    });
  });
}

function setupQuickSync() {
  syncPairs.forEach(([quickId, mainId]) => {
    const quick = byId(quickId);
    const main = byId(mainId);
    if (!quick || !main) return;

    quick.addEventListener("input", () => {
      main.value = quick.value;
      main.dispatchEvent(new Event("input", { bubbles: true }));
      main.dispatchEvent(new Event("change", { bubbles: true }));
      updateHudRule();
    });

    main.addEventListener("input", () => {
      quick.value = main.value;
      updateHudRule();
    });
  });

  byId("generate-rule-quick")?.addEventListener("click", () => byId("generate-rule")?.click());
  byId("random-rule-quick")?.addEventListener("click", () => byId("random-rule")?.click());
}

function setupCanvasControls() {
  let zoom = 100;
  const play = byId("canvas-play");
  const pause = byId("canvas-pause");
  const speed = byId("canvas-speed");
  const speedDisplay = byId("canvas-speed-display");

  play?.addEventListener("click", () => {
    document.documentElement.setAttribute("data-playing", "true");
    play.classList.add("hidden");
    pause.classList.remove("hidden");
  });

  pause?.addEventListener("click", () => {
    document.documentElement.setAttribute("data-playing", "false");
    pause.classList.add("hidden");
    play.classList.remove("hidden");
  });

  const savedSpeed = localStorage.getItem("simulation-speed") || "5";
  speed.value = savedSpeed;
  speedDisplay.textContent = `${savedSpeed}x`;
  speed.addEventListener("input", (event) => {
    const value = event.target.value;
    localStorage.setItem("simulation-speed", value);
    speedDisplay.textContent = `${value}x`;
  });

  const setZoom = (nextZoom) => {
    zoom = Math.max(25, Math.min(400, nextZoom));
    const canvas = byId("universe");
    canvas.style.transform = `scale(${zoom / 100})`;
    canvas.style.transformOrigin = "top left";
    byId("canvas-zoom-display").textContent = `${zoom}%`;
  };

  byId("canvas-zoom-out")?.addEventListener("click", () => setZoom(zoom - 10));
  byId("canvas-zoom-in")?.addEventListener("click", () => setZoom(zoom + 10));
  byId("canvas-reset")?.addEventListener("click", () => setZoom(100));
}

window.updatePaletteEditor = updatePaletteEditor;
window.AutomaginariumUI = {
  syncQuickControls,
  updateHudRule,
  updatePaletteEditor,
};

setupInspectorTabs();
setupTopTabs();
setupPaletteButtons();
setupQuickSync();
setupCanvasControls();
syncQuickControls();
updateHudRule();
