import { evaluerPopulation, nouvelleGeneration, populationInitiale, presetPoidsGenetique } from "./genetic-engine.mjs";

export function initializeGeneticWorkbench({ getConfig, applyConfig }) {
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
    const maxScore = Math.max(...history.map((h) => Math.max(h.best, h.avg)), 1);
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
    const config = getConfig();
    if (!config || !config.nombre_canaux_sortie) {
      leaderboardDiv.innerHTML = "<p style=\"color: var(--muted); font-size: 0.8rem;\">Aucune population evaluee</p>";
      return;
    }
    const bestPerChannel = Array.from({ length: config.nombre_canaux_sortie }, (_, ch) => ({
      score: -1,
      label: `Canal ${ch}`,
    }));
    evaluated.forEach(({ metriques }) => {
      if (!metriques?.scores_par_canal || metriques.scores_par_canal[0] === undefined) return;
      metriques.scores_par_canal.forEach((score, index) => {
        if (index < bestPerChannel.length && score > bestPerChannel[index].score) {
          bestPerChannel[index].score = score;
        }
      });
    });
    leaderboardDiv.innerHTML = "<h3 style=\"margin: 0 0 var(--space-md) 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted);\">Meilleur par canal</h3>";
    bestPerChannel.forEach(({ label, score }) => {
      const item = document.createElement("div");
      item.className = "genetic-leaderboard-item";
      item.innerHTML = `<span class="genetic-leaderboard-label">${label}</span><span class="genetic-leaderboard-score">${score >= 0 ? score.toFixed(3) : "---"}</span>`;
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
    sorted.forEach((individual, index) => {
      const card = document.createElement("div");
      card.className = `genetic-individu-card ${index === 0 ? "meilleur" : ""}`;
      const scoreHtml = `<div class="genetic-individu-score"><span>${index === 0 ? "*" : ""} #${index + 1}</span><span>${individual.score.toFixed(4)}</span></div>`;
      const metaHtml = `<div class="genetic-individu-meta">Gen ${gaState.generation} - ${individual.config.nom || "Sans nom"}</div>`;
      card.innerHTML = `${scoreHtml}${metaHtml}<div class="genetic-individu-actions"><button type="button">Adopter</button></div>`;
      card.querySelector("button").addEventListener("click", () => {
        applyConfig(individual.config, { source: "AG Adoption" });
      });
      container.appendChild(card);
    });
  }

  function runGaStep() {
    if (gaState.population.length === 0) return;
    gaState.evaluated = evaluerPopulation(gaState.population, gaState.poids);
    const best = gaState.evaluated.reduce((a, b) => (a.score > b.score ? a : b));
    const bestScore = best.score;
    const avg = gaState.evaluated.reduce((sum, individual) => sum + individual.score, 0) / gaState.evaluated.length;
    gaState.fitnessHistory.push({ best: bestScore, avg });
    gaState.generation += 1;
    gaState.population = nouvelleGeneration(
      gaState.population,
      gaState.evaluated.map((entry) => entry.score),
      50,
      Math.floor(Math.random() * 0x100000000),
    );
    const statusEl = document.querySelector("#ga-status");
    if (statusEl) statusEl.textContent = `Gen ${gaState.generation} - Meilleur: ${bestScore.toFixed(4)} - Moyen: ${avg.toFixed(4)}`;
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
        const config = getConfig();
        if (!config) {
          const statusEl = document.querySelector("#ga-status");
          if (statusEl) statusEl.textContent = "Erreur: aucune configuration chargee";
          return;
        }
        const size = Number(gaControls.populationSize?.value || 16);
        gaState.generation = 0;
        gaState.fitnessHistory = [];
        gaState.population = populationInitiale(config, size, Math.floor(Math.random() * 0x100000000));
        if (!gaState.population || gaState.population.length === 0) {
          const statusEl = document.querySelector("#ga-status");
          if (statusEl) statusEl.textContent = "Erreur: population vide";
          return;
        }
        runGaStep();
        const statusEl = document.querySelector("#ga-status");
        if (statusEl) statusEl.textContent = `Population initialisee: ${gaState.population.length} individus`;
      } catch (error) {
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
      if (!getConfig()) return;
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
      if (gaControls.evolve) gaControls.evolve.textContent = "Evoluer";
      const statusEl = document.querySelector("#ga-status");
      if (statusEl) statusEl.textContent = "Reinitialise";
      const browser = document.querySelector("#ga-population-browser");
      if (browser) browser.innerHTML = "";
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
      const best = gaState.evaluated.reduce((a, b) => (a.score > b.score ? a : b));
      if (!best?.config) {
        alert("Erreur: individu meilleur invalide");
        return;
      }
      if (!applyConfig(best.config, { source: "AG Meilleur individu" })) {
        alert("Erreur: configuration meilleur invalide ou univers vide");
      }
    });
  }

  Object.entries(gaControls.weightSliders).forEach(([key, slider]) => {
    if (!slider) return;
    slider.addEventListener("input", (event) => {
      gaState.poids[key] = Number(event.target.value);
      const valSpan = document.querySelector(`#ga-w-${key}-val`);
      if (valSpan) valSpan.textContent = event.target.value;
    });
  });

  gaControls.presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const weights = presetPoidsGenetique(btn.dataset.presetFitness);
      if (!weights) return;
      gaState.poids = weights;
      Object.entries(gaControls.weightSliders).forEach(([key, slider]) => {
        if (slider && gaState.poids[key] !== undefined) {
          slider.value = gaState.poids[key];
          const valSpan = document.querySelector(`#ga-w-${key}-val`);
          if (valSpan) valSpan.textContent = gaState.poids[key];
        }
      });
    });
  });

  return {
    dispose() {
      clearTimeout(gaState.evolveTimer);
      gaState.running = false;
    },
  };
}
