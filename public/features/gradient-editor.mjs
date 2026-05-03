// Gradient Editor UI Module
// Handles all UI interactions for the gradient panel: mode switching, color picking,
// preview rendering, and syncing with core configuration.

export function initializeGradientEditor({ getConfig, setConfig, render }) {
  const modeRadios = document.querySelectorAll('input[name="gradient-mode"]');
  const gradientControls = document.getElementById("gradient-controls");
  const methodSelect = document.getElementById("gradient-method");
  const anchorsContainer = document.getElementById("gradient-anchors");
  const previewCanvas = document.getElementById("gradient-preview");
  const sampleGridCanvas = document.getElementById("gradient-sample-grid");
  const resetBtn = document.getElementById("gradient-reset");
  const exportBtn = document.getElementById("gradient-export");

  let gradientState = {
    mode: "discret",
    method: "lineaire",
    anchors: {},
  };

  function getStateCount() {
    const config = getConfig();
    return config?.alphabet_sortie?.length || 2;
  }

  function getDefaultPalette() {
    const count = getStateCount();
    const palettes = {
      2: ["#0066ff", "#ff6b35"],
      3: ["#0066ff", "#00ff41", "#ff6b35"],
      4: ["#0066ff", "#00aaff", "#00ff41", "#ff6b35"],
    };
    if (palettes[count]) return palettes[count];
    // For 5+, generate evenly spaced hues
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i / count) * 360;
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  }

  function initializeGradientState() {
    const config = getConfig();
    const rendition = config?.rendu || {};
    const savedGradient = rendition.gradient || {};

    gradientState = {
      mode: savedGradient.mode || "discret",
      method: savedGradient.methode || "lineaire",
      ancres: savedGradient.ancres || {},
    };

    const stateCount = getStateCount();
    if (!gradientState.ancres || Object.keys(gradientState.ancres).length === 0) {
      const defaultPalette = getDefaultPalette();
      gradientState.ancres = {};
      for (let i = 0; i < stateCount; i++) {
        gradientState.ancres[String(i)] = defaultPalette[i] || "#808080";
      }
    }
  }

  function syncGradientToConfig() {
    const config = getConfig();
    if (!config) return;

    const updatedConfig = { ...config };
    updatedConfig.rendu = updatedConfig.rendu || {};
    updatedConfig.rendu.gradient = {
      mode: gradientState.mode,
      methode: gradientState.method,
      nombre_etats: getStateCount(),
      ancres: { ...gradientState.ancres },
    };

    setConfig(updatedConfig);
    if (typeof render === "function") {
      render();
    }
  }

  function renderColorPickers() {
    anchorsContainer.innerHTML = "";
    const stateCount = getStateCount();

    for (let i = 0; i < stateCount; i++) {
      const key = String(i);
      const color = gradientState.ancres[key] || "#808080";

      const anchorEl = document.createElement("div");
      anchorEl.className = "gradient-anchor";

      const labelEl = document.createElement("div");
      labelEl.className = "gradient-anchor-label";
      labelEl.textContent = `État ${i}`;

      const colorInputWrapper = document.createElement("div");
      colorInputWrapper.className = "gradient-anchor-color";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = hexToColor(color);
      colorInput.addEventListener("input", (e) => {
        const newColor = colorToHex(e.target.value);
        gradientState.ancres[key] = newColor;
        updatePreviewCanvases();
        syncGradientToConfig();
      });
      colorInputWrapper.appendChild(colorInput);

      const valueEl = document.createElement("div");
      valueEl.className = "gradient-anchor-value";
      valueEl.textContent = color;

      anchorEl.appendChild(labelEl);
      anchorEl.appendChild(colorInputWrapper);
      anchorEl.appendChild(valueEl);
      anchorsContainer.appendChild(anchorEl);
    }
  }

  function drawPreviewCanvas() {
    if (!previewCanvas) return;

    const ctx = previewCanvas.getContext("2d");
    const width = previewCanvas.width;
    const height = previewCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const stateCount = getStateCount();
    const pixelWidth = width / Math.max(stateCount, 1);

    for (let i = 0; i < stateCount; i++) {
      const t = stateCount > 1 ? i / (stateCount - 1) : 0;
      const color = interpolateColor(t);

      ctx.fillStyle = color;
      ctx.fillRect(i * pixelWidth, 0, pixelWidth, height);

      // Add subtle border between colors
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(i * pixelWidth, 0, pixelWidth, height);
    }

    // Add gradient overlay for visual appeal
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    const colors = Object.values(gradientState.ancres).slice(0, 3);
    colors.forEach((color, idx) => {
      gradient.addColorStop(idx / Math.max(colors.length - 1, 1), color);
    });
  }

  function drawSampleGrid() {
    if (!sampleGridCanvas) return;

    const ctx = sampleGridCanvas.getContext("2d");
    const width = sampleGridCanvas.width;
    const height = sampleGridCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const stateCount = getStateCount();
    const cols = Math.ceil(Math.sqrt(stateCount));
    const rows = Math.ceil(stateCount / cols);

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let i = 0; i < stateCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = col * cellWidth;
      const y = row * cellHeight;

      const t = stateCount > 1 ? i / (stateCount - 1) : 0;
      const color = interpolateColor(t);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellWidth, cellHeight);

      // Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellWidth, cellHeight);

      // State label
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i), x + cellWidth / 2, y + cellHeight / 2);
    }
  }

  function interpolateColor(t) {
    if (gradientState.mode === "discret") {
      const stateCount = getStateCount();
      const index = Math.floor(t * stateCount);
      return gradientState.ancres[String(Math.min(index, stateCount - 1))] || "#808080";
    }

    const stateCount = getStateCount();
    const method = gradientState.method;

    if (method === "lineaire" && stateCount >= 2) {
      const c0 = gradientState.ancres["0"] || "#0066ff";
      const c1 = gradientState.ancres["1"] || "#ff6b35";
      return lerpColor(t, c0, c1);
    }

    if (method === "barycentric" && stateCount >= 3) {
      const c0 = gradientState.ancres["0"] || "#0066ff";
      const c1 = gradientState.ancres["1"] || "#00ff41";
      const c2 = gradientState.ancres["2"] || "#ff6b35";

      const lambda0 = Math.max(0, 1 - t);
      const lambda1 = t < 0.5 ? t * 2 : (1 - t) * 2;
      const lambda2 = t;

      return barycentricColor(lambda0, lambda1, lambda2, c0, c1, c2);
    }

    if (method === "bilinear" && stateCount >= 4) {
      const c0 = gradientState.ancres["0"] || "#0066ff";
      const c1 = gradientState.ancres["1"] || "#00aaff";
      const c2 = gradientState.ancres["2"] || "#00ff41";
      const c3 = gradientState.ancres["3"] || "#ff6b35";

      const u = t * 2;
      const v = t * 2;

      return bilinearColor(
        u < 1 ? u : 2 - u,
        v < 1 ? v : 2 - v,
        c0,
        c1,
        c2,
        c3,
      );
    }

    // IDW fallback
    return idwColor(t);
  }

  function lerpColor(t, color1, color2) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function barycentricColor(l0, l1, l2, color1, color2, color3) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const c3 = hexToRgb(color3);

    const sum = l0 + l1 + l2 || 1;
    const n0 = l0 / sum;
    const n1 = l1 / sum;
    const n2 = l2 / sum;

    const r = Math.round(c1.r * n0 + c2.r * n1 + c3.r * n2);
    const g = Math.round(c1.g * n0 + c2.g * n1 + c3.g * n2);
    const b = Math.round(c1.b * n0 + c2.b * n1 + c3.b * n2);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function bilinearColor(u, v, color1, color2, color3, color4) {
    const uc = Math.max(0, Math.min(1, u));
    const vc = Math.max(0, Math.min(1, v));

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const c3 = hexToRgb(color3);
    const c4 = hexToRgb(color4);

    const bottom = {
      r: c1.r + (c2.r - c1.r) * uc,
      g: c1.g + (c2.g - c1.g) * uc,
      b: c1.b + (c2.b - c1.b) * uc,
    };

    const top = {
      r: c4.r + (c3.r - c4.r) * uc,
      g: c4.g + (c3.g - c4.g) * uc,
      b: c4.b + (c3.b - c4.b) * uc,
    };

    const r = Math.round(bottom.r + (top.r - bottom.r) * vc);
    const g = Math.round(bottom.g + (top.g - bottom.g) * vc);
    const b = Math.round(bottom.b + (top.b - bottom.b) * vc);

    return `rgb(${r}, ${g}, ${b})`;
  }

  function idwColor(t) {
    const stateCount = getStateCount();
    const colors = Object.values(gradientState.ancres);

    if (colors.length === 0) return "#808080";
    if (colors.length === 1) return colors[0];

    let weights = [];
    const position = t;

    for (let i = 0; i < stateCount; i++) {
      const pointPos = stateCount > 1 ? i / (stateCount - 1) : 0.5;
      const diff = Math.abs(position - pointPos);

      if (diff < 0.001) {
        return colors[i] || "#808080";
      }

      weights.push(1 / (diff * diff));
    }

    const sumWeights = weights.reduce((a, b) => a + b, 0);
    const colors_hex = Object.values(gradientState.ancres);
    const rgbs = colors_hex.map(hexToRgb);

    const r = Math.round(
      rgbs.reduce((sum, rgb, i) => sum + rgb.r * weights[i], 0) / sumWeights,
    );
    const g = Math.round(
      rgbs.reduce((sum, rgb, i) => sum + rgb.g * weights[i], 0) / sumWeights,
    );
    const b = Math.round(
      rgbs.reduce((sum, rgb, i) => sum + rgb.b * weights[i], 0) / sumWeights,
    );

    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.substr(0, 2), 16),
      g: parseInt(h.substr(2, 2), 16),
      b: parseInt(h.substr(4, 2), 16),
    };
  }

  function hexToColor(hex) {
    // Convert hex to format accepted by input[type="color"]
    if (hex.startsWith("#")) return hex;
    if (hex.startsWith("rgb")) {
      // Parse rgb(r,g,b) and convert to hex
      const match = hex.match(/\d+/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]).toString(16).padStart(2, "0");
        const g = parseInt(match[1]).toString(16).padStart(2, "0");
        const b = parseInt(match[2]).toString(16).padStart(2, "0");
        return `#${r}${g}${b}`;
      }
    }
    return "#808080";
  }

  function colorToHex(color) {
    // input[type="color"] returns #RRGGBB
    return color;
  }

  function updatePreviewCanvases() {
    drawPreviewCanvas();
    drawSampleGrid();
  }

  function onModeChange(e) {
    gradientState.mode = e.target.value;
    gradientControls.style.display = gradientState.mode === "gradient" ? "grid" : "none";
    updatePreviewCanvases();
    syncGradientToConfig();
  }

  function onMethodChange(e) {
    gradientState.method = e.target.value;
    renderColorPickers(); // Show/hide relevant color pickers
    updatePreviewCanvases();
    syncGradientToConfig();
  }

  function onReset() {
    const defaultPalette = getDefaultPalette();
    gradientState.ancres = {};
    const stateCount = getStateCount();
    for (let i = 0; i < stateCount; i++) {
      gradientState.ancres[String(i)] = defaultPalette[i] || "#808080";
    }
    renderColorPickers();
    updatePreviewCanvases();
    syncGradientToConfig();
  }

  function onExport() {
    const config = getConfig();
    const exportData = {
      nom: config?.nom,
      gradient: gradientState,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gradient-${gradientState.mode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Event listeners
  modeRadios.forEach((radio) => {
    radio.addEventListener("change", onModeChange);
  });

  if (methodSelect) {
    methodSelect.addEventListener("change", onMethodChange);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", onReset);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", onExport);
  }

  // Initialize
  function init() {
    initializeGradientState();
    modeRadios.forEach((radio) => {
      radio.checked = radio.value === gradientState.mode;
    });
    if (methodSelect) {
      methodSelect.value = gradientState.method;
    }
    gradientControls.style.display = gradientState.mode === "gradient" ? "grid" : "none";
    renderColorPickers();
    updatePreviewCanvases();
  }

  // Public API
  return {
    init,
    updateOnConfigChange: () => {
      initializeGradientState();
      renderColorPickers();
      updatePreviewCanvases();
    },
    getGradientState: () => ({ ...gradientState }),
  };
}
