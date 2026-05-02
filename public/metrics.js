/*
 * Adapted from Cellcosmos public/metrics.js.
 * Original project: https://github.com/multilingualprogramming/cellcosmos
 * Kept as a reusable browser metrics layer for future Automaginarium stages.
 */

/**
 * Life Signatures: browser-side grid scans with multilingual/WASM formulas.
 */

function metricsWasm() {
  return window.cellcosmosWasm || null;
}

function callMetricExport(name, fallback, ...args) {
  const exports = metricsWasm();
  if (exports && typeof exports[name] === "function") {
    try {
      const value = Number(exports[name](...args));
      if (Number.isFinite(value)) return value;
      console.warn(`Export WASM ${name} a retourne une valeur invalide; repli JavaScript.`, value);
    } catch (error) {
      console.error(error);
    }
  }
  return fallback(...args);
}

function countLiveCells(grid) {
  let totalCells = 0;
  let liveCells = 0;

  grid.forEach((row) => {
    row.forEach((cell) => {
      totalCells += 1;
      if (cell === 1) liveCells += 1;
    });
  });

  return { totalCells, liveCells };
}

function fallbackEntropy(totalCells, liveCells) {
  if (totalCells === 0) return 0;
  const p = liveCells / totalCells;
  const q = 1 - p;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + q * Math.log2(q));
}

function calculateEntropy(grid) {
  if (!grid || grid.length === 0) return 0;
  const { totalCells, liveCells } = countLiveCells(grid);
  return callMetricExport("metrique_entropie_depuis_comptage", fallbackEntropy, totalCells, liveCells);
}

function fallbackCompactness(liveCells, perimeter) {
  if (liveCells === 0) return 0;
  const minPerimeter = 2 * Math.sqrt(Math.PI * liveCells);
  return Math.min(1, minPerimeter / Math.max(1, perimeter));
}

function measureCompactness(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let liveCells = 0;
  let perimeter = 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (grid[y][x] !== 1) continue;
      liveCells += 1;

      const neighbors = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]];
      neighbors.forEach(([ny, nx]) => {
        if (ny < 0 || ny >= rows || nx < 0 || nx >= cols || grid[ny][nx] === 0) {
          perimeter += 1;
        }
      });
    }
  }

  return { liveCells, perimeter };
}

function calculateCompactness(grid) {
  if (!grid || grid.length === 0) return 0;
  const { liveCells, perimeter } = measureCompactness(grid);
  return callMetricExport("metrique_compacite_depuis_mesures", fallbackCompactness, liveCells, perimeter);
}

function fallbackFragmentation(clusters, liveCells) {
  if (liveCells === 0) return 0;
  return Math.min(1, (clusters / Math.sqrt(liveCells)) / 5);
}

function measureFragmentation(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array(rows).fill(null).map(() => Array(cols).fill(false));
  let clusters = 0;
  let liveCells = 0;

  function dfs(y, x) {
    if (y < 0 || y >= rows || x < 0 || x >= cols || visited[y][x] || grid[y][x] === 0) {
      return;
    }
    visited[y][x] = true;
    dfs(y - 1, x);
    dfs(y + 1, x);
    dfs(y, x - 1);
    dfs(y, x + 1);
  }

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (grid[y][x] !== 1) continue;
      liveCells += 1;
      if (!visited[y][x]) {
        clusters += 1;
        dfs(y, x);
      }
    }
  }

  return { clusters, liveCells };
}

function calculateFragmentation(grid) {
  if (!grid || grid.length === 0) return 0;
  const { clusters, liveCells } = measureFragmentation(grid);
  return callMetricExport("metrique_fragmentation_depuis_mesures", fallbackFragmentation, clusters, liveCells);
}

function fallbackGrowthRate(previousLive, currentLive) {
  if (previousLive === 0) return currentLive > 0 ? 1 : 0;
  return Math.max(-1, Math.min(1, (currentLive - previousLive) / previousLive));
}

function calculateGrowthRate(previousGrid, currentGrid) {
  if (!previousGrid || !currentGrid || previousGrid.length === 0) return 0;
  const previousLive = countLiveCells(previousGrid).liveCells;
  const currentLive = countLiveCells(currentGrid).liveCells;
  return callMetricExport("metrique_croissance_depuis_comptages", fallbackGrowthRate, previousLive, currentLive);
}

function fallbackSymmetry(horizontalMatches, verticalMatches, total) {
  if (total === 0) return 0;
  return (horizontalMatches + verticalMatches) / (2 * total);
}

function measureSymmetry(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  let horizontalMatches = 0;
  let verticalMatches = 0;
  let total = 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < Math.ceil(cols / 2); x += 1) {
      if (grid[y][x] === grid[y][cols - 1 - x]) horizontalMatches += 1;
      total += 1;
    }
  }

  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < Math.ceil(rows / 2); y += 1) {
      if (grid[y][x] === grid[rows - 1 - y][x]) verticalMatches += 1;
      total += 1;
    }
  }

  return { horizontalMatches, verticalMatches, total };
}

function calculateSymmetry(grid) {
  if (!grid || grid.length === 0) return 0;
  const { horizontalMatches, verticalMatches, total } = measureSymmetry(grid);
  return callMetricExport(
    "metrique_symetrie_depuis_correspondances",
    fallbackSymmetry,
    horizontalMatches,
    verticalMatches,
    total,
  );
}

const metricsHistory = {
  entropy: [],
  compactness: [],
  fragmentation: [],
  symmetry: [],
  growthRate: [],
  previousGrid: null,
  maxHistoryLength: 60,

  record(grid) {
    this.entropy.push(calculateEntropy(grid));
    this.compactness.push(calculateCompactness(grid));
    this.fragmentation.push(calculateFragmentation(grid));
    this.symmetry.push(calculateSymmetry(grid));
    this.growthRate.push(calculateGrowthRate(this.previousGrid, grid));
    this.previousGrid = grid.map((row) => [...row]);

    if (this.entropy.length > this.maxHistoryLength) {
      this.entropy.shift();
      this.compactness.shift();
      this.fragmentation.shift();
      this.symmetry.shift();
      this.growthRate.shift();
    }
  },

  getAverages() {
    const avg = (arr) => {
      const values = arr.filter(Number.isFinite);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };
    return {
      entropy: avg(this.entropy),
      compactness: avg(this.compactness),
      fragmentation: avg(this.fragmentation),
      symmetry: avg(this.symmetry),
      growthRate: avg(this.growthRate),
    };
  },

  reset() {
    this.entropy = [];
    this.compactness = [];
    this.fragmentation = [];
    this.symmetry = [];
    this.growthRate = [];
    this.previousGrid = null;
  },
};

function fallbackDynamicClass(metrics) {
  const { entropy, compactness, fragmentation, symmetry, growthRate } = metrics;
  const score = {
    stability: (1 - entropy) * (1 - Math.abs(growthRate)) * 0.5 + compactness * 0.5,
    chaos: entropy * (1 - compactness),
    organization: compactness * symmetry * (1 - fragmentation),
    dispersion: fragmentation * entropy,
    growth: Math.abs(growthRate),
  };
  const maxScore = Math.max(...Object.values(score));
  return Object.keys(score).find((key) => score[key] === maxScore) || "complex";
}

function classifyDynamics(metrics) {
  const classNames = {
    1: "Stable",
    2: "Chaotique",
    3: "Organis\u00e9",
    4: "Dispers\u00e9",
    5: "Croissance",
    stable: "Stable",
    stability: "Stable",
    chaos: "Chaotique",
    organization: "Organis\u00e9",
    dispersion: "Dispers\u00e9",
    growth: "Croissance",
  };

  const exports = metricsWasm();
  if (exports && typeof exports.metrique_classe_dynamique === "function") {
    try {
      const id = Number(exports.metrique_classe_dynamique(
        metrics.entropy,
        metrics.compactness,
        metrics.fragmentation,
        metrics.symmetry,
        metrics.growthRate,
      ));
      return classNames[id] || "Complexe";
    } catch (error) {
      console.error(error);
    }
  }

  return classNames[fallbackDynamicClass(metrics)] || "Complexe";
}

function getMetricsColor(value, type = "neutral") {
  if (type === "entropy") {
    if (value < 0.3) return "#83b0ff";
    if (value < 0.7) return "#ffd166";
    return "#ff6b6b";
  }
  if (type === "compactness") {
    if (value > 0.6) return "#83b0ff";
    if (value > 0.3) return "#ffd166";
    return "#ff6b6b";
  }
  if (type === "growth") {
    if (value > 0.1) return "#51b347";
    if (value < -0.1) return "#ff6b6b";
    return "#ffd166";
  }
  return "#888";
}
