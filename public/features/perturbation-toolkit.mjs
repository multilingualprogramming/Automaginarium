import { appliquerPerturbation } from "./perturbation-engine.mjs";

export function initializePerturbationToolkit({ canvas, getConfig, getUniverse, setUniverse, render }) {
  const perturbState = {
    toolActif: "inspecter",
    type: "pulse",
    rayon: 10,
    force: 0.5,
    gelDuree: 5,
    fxAnneaux: true,
    fxFumee: true,
    fxChaleur: false,
    evenements: [],
    particules: [],
    anneaux: [],
    heatMap: null,
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
    if (!overlayCanvas || !config) return;
    const cell = Number(config.rendu.taille_cellule || 5);
    overlayCanvas.width = config.largeur * cell;
    overlayCanvas.height = config.hauteur * cell;
  }

  function spawnGlowRing(cx, cy, rayon) {
    if (!perturbState.fxAnneaux) return;
    perturbState.anneaux.push({ cx, cy, rayon, life: 1, age: 0 });
  }

  function spawnSmokeTrail(cx, cy, cellSize) {
    if (!perturbState.fxFumee) return;
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      perturbState.particules.push({
        x: (cx * cellSize) + (cellSize / 2),
        y: (cy * cellSize) + (cellSize / 2),
        vx: Math.cos(angle) * (1 + Math.random()),
        vy: Math.sin(angle) * (1 + Math.random()),
        life: 1,
        age: 0,
        radius: cellSize * 0.3,
      });
    }
  }

  function updateHeatMap(cx, cy, rayon, cellSize) {
    const config = getConfig();
    if (!perturbState.fxChaleur || !config) return;
    if (!perturbState.heatMap) {
      perturbState.heatMap = new Float32Array(config.largeur * config.hauteur);
    }
    const cxPx = cx * cellSize;
    const cyPx = cy * cellSize;
    const radiusPx = rayon * cellSize;
    for (let y = Math.max(0, cy - rayon - 1); y < Math.min(config.hauteur, cy + rayon + 2); y += 1) {
      for (let x = Math.max(0, cx - rayon - 1); x < Math.min(config.largeur, cx + rayon + 2); x += 1) {
        const dx = (x * cellSize) + (cellSize / 2) - cxPx;
        const dy = (y * cellSize) + (cellSize / 2) - cyPx;
        const dist = Math.sqrt((dx * dx) + (dy * dy));
        if (dist < radiusPx) {
          const index = (y * config.largeur) + x;
          const intensity = 1 - (dist / radiusPx);
          perturbState.heatMap[index] = Math.min(1, perturbState.heatMap[index] + (intensity * 0.3));
        }
      }
    }
  }

  function renderGlowRings(cellSize) {
    if (!overlayCtx || perturbState.anneaux.length === 0) return;
    perturbState.anneaux = perturbState.anneaux.filter((ring) => {
      ring.age += 0.05;
      ring.life = Math.max(0, 1 - ring.age);
      if (ring.life <= 0) return false;
      overlayCtx.strokeStyle = `rgba(0, 255, 200, ${ring.life * 0.5})`;
      overlayCtx.lineWidth = 2;
      overlayCtx.beginPath();
      overlayCtx.arc((ring.cx * cellSize) + (cellSize / 2), (ring.cy * cellSize) + (cellSize / 2), ring.rayon + (ring.age * 20), 0, Math.PI * 2);
      overlayCtx.stroke();
      return true;
    });
  }

  function renderSmokeTrails() {
    if (!overlayCtx || perturbState.particules.length === 0) return;
    perturbState.particules = perturbState.particules.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.age += 0.02;
      particle.life = Math.max(0, 1 - particle.age);
      particle.vy += 0.05;
      if (particle.life <= 0) return false;
      overlayCtx.fillStyle = `rgba(0, 255, 200, ${particle.life * 0.4})`;
      overlayCtx.beginPath();
      overlayCtx.arc(particle.x, particle.y, particle.radius * particle.life, 0, Math.PI * 2);
      overlayCtx.fill();
      return true;
    });
  }

  function hslToRgb(h, s, l) {
    let r;
    let g;
    let b;
    const hue = h / 360;
    const sat = s / 100;
    const lig = l / 100;
    if (sat === 0) {
      r = lig;
      g = lig;
      b = lig;
    } else {
      const hue2rgb = (p, q, t) => {
        let value = t;
        if (value < 0) value += 1;
        if (value > 1) value -= 1;
        if (value < 1 / 6) return p + ((q - p) * 6 * value);
        if (value < 1 / 2) return q;
        if (value < 2 / 3) return p + ((q - p) * ((2 / 3) - value) * 6);
        return p;
      };
      const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - (lig * sat);
      const p = (2 * lig) - q;
      r = hue2rgb(p, q, hue + (1 / 3));
      g = hue2rgb(p, q, hue);
      b = hue2rgb(p, q, hue - (1 / 3));
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function renderHeatMap(cellSize) {
    const config = getConfig();
    if (!overlayCtx || !perturbState.heatMap || !config) return;
    const width = Math.ceil(config.largeur * cellSize);
    const height = Math.ceil(config.hauteur * cellSize);
    const imageData = overlayCtx.createImageData(width, height);
    const data = imageData.data;
    for (let y = 0; y < config.hauteur; y += 1) {
      for (let x = 0; x < config.largeur; x += 1) {
        const heatVal = perturbState.heatMap[(y * config.largeur) + x];
        for (let py = 0; py < cellSize; py += 1) {
          for (let px = 0; px < cellSize; px += 1) {
            const idx = ((((y * cellSize) + py) * width) + ((x * cellSize) + px)) * 4;
            const rgb = hslToRgb(heatVal * 240, 100, 50);
            data[idx] = rgb[0];
            data[idx + 1] = rgb[1];
            data[idx + 2] = rgb[2];
            data[idx + 3] = Math.min(255, heatVal * 180);
          }
        }
      }
    }
    overlayCtx.putImageData(imageData, 0, 0);
    for (let i = 0; i < perturbState.heatMap.length; i += 1) {
      perturbState.heatMap[i] *= 0.97;
    }
  }

  function effectsAnimationLoop() {
    const config = getConfig();
    if (!overlayCtx || !overlayCanvas || !config || (!perturbState.fxAnneaux && !perturbState.fxFumee && !perturbState.fxChaleur)) {
      perturbState.animFrameId = null;
      return;
    }
    const cell = Number(config.rendu.taille_cellule || 5);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (perturbState.fxChaleur) renderHeatMap(cell);
    if (perturbState.fxFumee) renderSmokeTrails();
    if (perturbState.fxAnneaux) renderGlowRings(cell);
    const hot = perturbState.heatMap ? perturbState.heatMap.some((value) => value > 0.01) : false;
    if (perturbState.anneaux.length > 0 || perturbState.particules.length > 0 || hot) {
      perturbState.animFrameId = requestAnimationFrame(effectsAnimationLoop);
    } else {
      perturbState.animFrameId = null;
    }
  }

  function startEffectsLoop() {
    if (perturbState.animFrameId) return;
    effectsAnimationLoop();
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

  function handleCanvasPerturb(event) {
    const config = getConfig();
    const universe = getUniverse();
    if (!config || !universe) return;
    const rect = canvas.getBoundingClientRect();
    const cellSize = Number(config.rendu.taille_cellule || 5);
    const cx = Math.floor((event.clientX - rect.left) / cellSize);
    const cy = Math.floor((event.clientY - rect.top) / cellSize);
    if (cx < 0 || cy < 0 || cx >= config.largeur || cy >= config.hauteur) return;

    if (perturbState.toolActif === "inspecter") {
      const inspectEl = document.querySelector("#perturb-inspect-cell");
      if (inspectEl && universe.lignes[cy]) {
        inspectEl.textContent = `Cell [${cx}, ${cy}]\nValue: ${universe.lignes[cy][cx]}`;
      }
      return;
    }

    let typeMap = "pulse";
    if (perturbState.toolActif === "attirer") typeMap = "attirer";
    else if (perturbState.toolActif === "geler") typeMap = "geler";
    else if (perturbState.toolActif === "muter") typeMap = "muter";

    const evt = {
      cx,
      cy,
      rayon: perturbState.rayon,
      force: perturbState.force,
      type: typeMap,
      graine: Math.floor(Math.random() * 0x100000000),
      t: Date.now(),
    };
    perturbState.evenements.push(evt);
    if (perturbState.evenements.length > 24) perturbState.evenements.shift();

    const nextUniverse = appliquerPerturbation(universe, evt);
    if (nextUniverse) {
      setUniverse(nextUniverse);
      render();
      spawnGlowRing(cx, cy, perturbState.rayon);
      spawnSmokeTrail(cx, cy, cellSize);
      updateHeatMap(cx, cy, perturbState.rayon, cellSize);
      startEffectsLoop();
    }
    renderPerturbQueue();
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

  initOverlayCanvas();
  resizeOverlayCanvas(getConfig());

  perturbControls.toolBtns.forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.dataset.tool === "inspecter" ? "true" : "false");
    btn.addEventListener("click", () => {
      perturbControls.toolBtns.forEach((button) => button.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      perturbState.toolActif = btn.dataset.tool;
    });
  });

  if (perturbControls.typeSelect) {
    perturbControls.typeSelect.addEventListener("change", (event) => {
      perturbState.type = event.target.value;
    });
  }
  if (perturbControls.rayonSlider) {
    perturbControls.rayonSlider.addEventListener("input", (event) => {
      perturbState.rayon = Number(event.target.value);
      const valSpan = document.querySelector("#perturb-rayon-val");
      if (valSpan) valSpan.textContent = event.target.value;
    });
  }
  if (perturbControls.forceSlider) {
    perturbControls.forceSlider.addEventListener("input", (event) => {
      perturbState.force = Number(event.target.value) / 10;
      const valSpan = document.querySelector("#perturb-force-val");
      if (valSpan) valSpan.textContent = (Number(event.target.value) / 10).toFixed(1);
    });
  }
  if (perturbControls.gelDureeInput) {
    perturbControls.gelDureeInput.addEventListener("input", (event) => {
      perturbState.gelDuree = Number(event.target.value);
    });
  }
  if (perturbControls.fxAnneaux) {
    perturbControls.fxAnneaux.addEventListener("change", (event) => {
      perturbState.fxAnneaux = event.target.checked;
    });
  }
  if (perturbControls.fxFumee) {
    perturbControls.fxFumee.addEventListener("change", (event) => {
      perturbState.fxFumee = event.target.checked;
    });
  }
  if (perturbControls.fxChaleur) {
    perturbControls.fxChaleur.addEventListener("change", (event) => {
      perturbState.fxChaleur = event.target.checked;
    });
  }
  if (perturbControls.clearQueue) {
    perturbControls.clearQueue.addEventListener("click", () => {
      perturbState.evenements = [];
      renderPerturbQueue();
    });
  }

  canvas.addEventListener("click", handleCanvasPerturb);

  return {
    onConfigApplied(config) {
      resizeOverlayCanvas(config);
    },
    dispose() {
      canvas.removeEventListener("click", handleCanvasPerturb);
      if (perturbState.animFrameId) cancelAnimationFrame(perturbState.animFrameId);
    },
  };
}
