/*
 * Automaginarium browser bridge.
 *
 * This adapter forwards calls to the compiled French Multilingual core.
 * All domain logic (cellular automata, rules, generation) is canonical in
 * src/automate_universel.ml. These functions are temporary fallbacks/mirrors
 * until the Multilingual→WASM compilation pipeline is live.
 *
 * JavaScript serves only: canvas rendering, DOM, interface events.
 * All cellular automata logic belongs in src/.
 */

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function callPacked(name, args, fallback) {
  const packed = window.AutomaginariumPacked;
  if (packed && typeof packed[name] === "function") {
    try {
      const value = Number(packed[name](...args));
      if (Number.isFinite(value)) return value;
    } catch (error) {
      console.warn(`Automaginarium: WASM export ${name} failed; using fallback.`, error);
    }
  }
  return fallback;
}

// ============================================================================
// TEMPORARY: These functions are duplicated from src/automate_universel.ml.
// They are fallbacks until the ML is compiled to WASM/JS.
// DO NOT ADD NEW LOGIC HERE. Update src/automate_universel.ml instead.
// ============================================================================

function cleVoisinage(voisinage) {
  return JSON.stringify(voisinage);
}

function ancienneCleVoisinage(voisinage) {
  return voisinage.map(String).join("");
}

function sortieDefaut(configuration) {
  return Array.from({ length: configuration.nombre_canaux_sortie }, () => configuration.alphabet_sortie[0] ?? 0);
}

function normaliserSortie(sortie, configuration) {
  const valeurs = Array.isArray(sortie) ? [...sortie] : [sortie];
  while (valeurs.length < configuration.nombre_canaux_sortie) valeurs.push(valeurs[0] ?? configuration.alphabet_sortie[0]);
  return valeurs.slice(0, configuration.nombre_canaux_sortie);
}

function normaliserConfiguration(configuration) {
  const alphabetEntree = Array.isArray(configuration.alphabet_entree) && configuration.alphabet_entree.length > 0
    ? configuration.alphabet_entree
    : [0, 1];
  const alphabetSortie = Array.isArray(configuration.alphabet_sortie) && configuration.alphabet_sortie.length > 0
    ? configuration.alphabet_sortie
    : alphabetEntree;
  let tailleVoisinage = Number(configuration.taille_voisinage || 3);
  tailleVoisinage = Math.trunc(callPacked("taille_voisinage_normalisee", [tailleVoisinage], (
    tailleVoisinage < 1 ? 1 : (tailleVoisinage % 2 === 0 ? tailleVoisinage + 1 : tailleVoisinage)
  )));
  return {
    nom: configuration.nom || "Univers sans nom",
    alphabet_entree: alphabetEntree,
    alphabet_sortie: alphabetSortie,
    taille_voisinage: tailleVoisinage,
    nombre_canaux_sortie: Math.max(1, Number(configuration.nombre_canaux_sortie || 1)),
    mode_regle: configuration.mode_regle || "table",
    table_transition: configuration.table_transition || {},
    numero_regle: configuration.numero_regle !== undefined ? BigInt(configuration.numero_regle) : 0n,
    frontiere: configuration.frontiere || "fixe",
    valeur_frontiere: configuration.valeur_frontiere ?? alphabetEntree[0],
    largeur: Math.max(1, Number(configuration.largeur || 161)),
    hauteur: Math.max(1, Number(configuration.hauteur || 100)),
    etat_initial: configuration.etat_initial || { mode: "centre" },
    rendu: configuration.rendu || {},
  };
}

function lireCellule(ligne, indice, configuration) {
  if (indice >= 0 && indice < ligne.length) return ligne[indice];
  if (configuration.frontiere === "circulaire" && ligne.length > 0) {
    return ligne[((indice % ligne.length) + ligne.length) % ligne.length];
  }
  return configuration.valeur_frontiere;
}

function voisinageCellule(ligne, indice, configuration) {
  const rayon = Math.floor(configuration.taille_voisinage / 2);
  const voisinage = [];
  for (let decalage = -rayon; decalage <= rayon; decalage += 1) {
    voisinage.push(lireCellule(ligne, indice + decalage, configuration));
  }
  return voisinage;
}

function ruleConfiguration(configuration) {
  const s = configuration.alphabet_entree.length;
  const k = configuration.taille_voisinage;
  const t = configuration.alphabet_sortie.length;
  const m = configuration.nombre_canaux_sortie;
  const base = Math.pow(t, m);
  const digits = Math.pow(s, k);
  const baseBig = BigInt(Math.round(base));
  const digitsBig = BigInt(Math.round(digits));
  const maxRule = baseBig ** digitsBig;
  return { s, k, t, m, base, digits, maxRule };
}

function neighborhoodToRuleIndex(voisinage, alphabet) {
  const s = alphabet.length;
  let index = 0;
  for (let i = 0; i < voisinage.length; i += 1) {
    const symbolIndex = alphabet.indexOf(voisinage[i]);
    if (symbolIndex < 0) return null;
    index = index * s + symbolIndex;
  }
  return index;
}

function codeVoisinageNumerique(voisinage, base) {
  let index = 0;
  for (let i = 0; i < voisinage.length; i += 1) {
    index = index * base + Number(voisinage[i]);
  }
  return index;
}

function ruleIndexToNeighborhood(index, config) {
  const { s, k } = ruleConfiguration(config);
  const voisinage = [];
  let remaining = index;
  for (let i = k - 1; i >= 0; i -= 1) {
    const symbolIndex = Math.floor(remaining / Math.pow(s, i));
    voisinage.push(config.alphabet_entree[symbolIndex]);
    remaining = remaining % Math.pow(s, i);
  }
  return voisinage;
}

function outputToRuleDigit(output, config) {
  const { t, m } = ruleConfiguration(config);
  const normalized = normaliserSortie(output, config);
  let digit = 0;
  for (let ch = 0; ch < m; ch += 1) {
    const symbolIndex = config.alphabet_sortie.indexOf(normalized[ch]);
    if (symbolIndex < 0) return null;
    digit = digit * t + symbolIndex;
  }
  return digit;
}

function ruleDigitToOutput(digit, config) {
  const { t, m } = ruleConfiguration(config);
  const output = [];
  let remaining = digit;
  for (let ch = m - 1; ch >= 0; ch -= 1) {
    const symbolIndex = Math.floor(remaining / Math.pow(t, ch));
    output.push(config.alphabet_sortie[symbolIndex]);
    remaining = remaining % Math.pow(t, ch);
  }
  return output;
}

function getRuleOutput(ruleNumber, voisinage, config) {
  const index = neighborhoodToRuleIndex(voisinage, config.alphabet_entree);
  if (index === null) return sortieDefaut(config);
  const { base } = ruleConfiguration(config);
  const baseBig = BigInt(base);
  const ruleNumberBig = BigInt(ruleNumber);
  const digit = Number((ruleNumberBig / (baseBig ** BigInt(index))) % baseBig);
  return ruleDigitToOutput(digit, config);
}

function appliquerRegle(voisinage, configuration, random) {
  if (configuration.mode_regle === "numerique") {
    return getRuleOutput(configuration.numero_regle ?? 0n, voisinage, configuration);
  }
  if (configuration.mode_regle === "totalistique") {
    const sum = voisinage.reduce((acc, value) => acc + Number(value), 0);
    const index = Number.isFinite(sum)
      ? Math.trunc(callPacked("sortie_totalistique", [sum, configuration.alphabet_sortie.length, 0], ((sum % configuration.alphabet_sortie.length) + configuration.alphabet_sortie.length) % configuration.alphabet_sortie.length))
      : cleVoisinage(voisinage).length % configuration.alphabet_sortie.length;
    return Array.from(
      { length: configuration.nombre_canaux_sortie },
      (_, channel) => configuration.alphabet_sortie[(index + channel) % configuration.alphabet_sortie.length],
    );
  }
  if (configuration.mode_regle === "aleatoire") {
    return Array.from(
      { length: configuration.nombre_canaux_sortie },
      () => configuration.alphabet_sortie[Math.floor(random() * configuration.alphabet_sortie.length)],
    );
  }
  const table = configuration.table_transition || {};
  const sortie = table[cleVoisinage(voisinage)] ?? table[ancienneCleVoisinage(voisinage)] ?? sortieDefaut(configuration);
  const values = Array.isArray(sortie) ? [...sortie] : [sortie];
  while (values.length < configuration.nombre_canaux_sortie) values.push(values[0] ?? configuration.alphabet_sortie[0]);
  return values.slice(0, configuration.nombre_canaux_sortie);
}

function creerGenerationInitiale(configuration) {
  const empty = configuration.alphabet_entree[0];
  const live = configuration.alphabet_entree[1] ?? empty;
  const generation = Array.from({ length: configuration.largeur }, () => empty);
  const initial = configuration.etat_initial || { mode: "centre" };
  if (initial.mode === "aleatoire") {
    const random = mulberry32(Number(initial.graine || 42));
    const probability = Number(initial.probabilite ?? 0.28);
    return generation.map(() => (
      random() < probability
        ? configuration.alphabet_entree[Math.floor(random() * configuration.alphabet_entree.length)]
        : empty
    ));
  }
  if (initial.mode === "motif" && Array.isArray(initial.valeurs)) {
    const start = Math.max(0, Math.floor((configuration.largeur - initial.valeurs.length) / 2));
    initial.valeurs.forEach((value, index) => {
      if (start + index < generation.length) generation[start + index] = value;
    });
    return generation;
  }
  generation[Math.floor(configuration.largeur / 2)] = live;
  return generation;
}

function prochaineGeneration(generation, configuration, seed) {
  const random = mulberry32(seed || 0);
  const suivante = [];
  const sorties = [];
  generation.forEach((_, index) => {
    const sortie = appliquerRegle(voisinageCellule(generation, index, configuration), configuration, random);
    sorties.push(sortie);
    suivante.push(sortie[0] ?? configuration.alphabet_sortie[0]);
  });
  return { generation: suivante, sorties };
}

function genererUnivers(configurationBrute) {
  const configuration = normaliserConfiguration(configurationBrute);
  const lignes = [creerGenerationInitiale(configuration)];
  const sorties = [lignes[0].map((value) => (
    Array.from({ length: configuration.nombre_canaux_sortie }, () => value)
  ))];
  for (let row = 1; row < configuration.hauteur; row += 1) {
    const next = prochaineGeneration(lignes[row - 1], configuration, row);
    lignes.push(next.generation);
    sorties.push(next.sorties);
  }
  return { configuration, lignes, sorties };
}

function tableWolfram(numeroRegle) {
  const table = {};
  for (let motif = 0; motif < 8; motif += 1) {
    const voisinage = motif.toString(2).padStart(3, "0").split("").map(Number);
    table[cleVoisinage(voisinage)] = [Math.trunc(callPacked("sortie_wolfram", [numeroRegle, motif], Math.floor(numeroRegle / (2 ** motif)) % 2))];
  }
  return table;
}

function toutesClesVoisinage(alphabet, taille) {
  const keys = [];
  function visit(prefix, depth) {
    if (depth === taille) {
      keys.push(cleVoisinage(prefix));
      return;
    }
    alphabet.forEach((symbol) => visit([...prefix, symbol], depth + 1));
  }
  visit([], 0);
  return keys;
}

function validerConfiguration(configurationBrute) {
  const config = normaliserConfiguration(configurationBrute);
  const erreurs = [];
  const avertissements = [];
  if (!Array.isArray(config.alphabet_entree) || config.alphabet_entree.length === 0) erreurs.push("alphabet_entree vide");
  if (!Array.isArray(config.alphabet_sortie) || config.alphabet_sortie.length === 0) erreurs.push("alphabet_sortie vide");
  if (config.taille_voisinage < 1 || config.taille_voisinage % 2 === 0) erreurs.push("taille_voisinage doit etre impair et positif");
  if (!["table", "totalistique", "aleatoire", "numerique"].includes(config.mode_regle)) erreurs.push("mode_regle inconnu");
  if (config.mode_regle === "table") {
    toutesClesVoisinage(config.alphabet_entree, config.taille_voisinage).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(config.table_transition, key)) avertissements.push(`transition absente ${key}`);
    });
    Object.entries(config.table_transition).forEach(([key, sortie]) => {
      try {
        const voisinage = JSON.parse(key);
        if (!Array.isArray(voisinage) || voisinage.length !== config.taille_voisinage) {
          avertissements.push(`cle non canonique ${key}`);
        }
      } catch (error) {
        avertissements.push(`ancienne cle ou cle non JSON ${key}`);
      }
      if (normaliserSortie(sortie, config).length !== config.nombre_canaux_sortie) erreurs.push(`sortie invalide ${key}`);
    });
  }
  return { valide: erreurs.length === 0, erreurs, avertissements };
}

// ============================================================================
// GENETIC ALGORITHM METHODS
// ============================================================================

function croisementTableUniforme(tableA, tableB, graine) {
  const gen = mulberry32(graine);
  const clesA = Object.keys(tableA);
  const clesB = Object.keys(tableB);
  const clesUnion = new Set([...clesA, ...clesB]);
  const tableEnfant = {};
  clesUnion.forEach((cle) => {
    const parent = gen() < 0.5 ? tableA : tableB;
    if (Object.prototype.hasOwnProperty.call(parent, cle)) {
      tableEnfant[cle] = Array.isArray(parent[cle]) ? [...parent[cle]] : [parent[cle]];
    }
  });
  return tableEnfant;
}

function muterTable(table, cles, alphabetSortie, nombreCanaux, tauxSur1000, graine) {
  const gen = mulberry32(graine);
  const tableMutee = {};
  const probabiliteBase = tauxSur1000 / 1000.0;
  cles.forEach((cle) => {
    const sortie = table[cle] || [alphabetSortie[0]];
    const sortieMutee = [];
    for (let canal = 0; canal < nombreCanaux; canal += 1) {
      let valeur = Array.isArray(sortie) && canal < sortie.length ? sortie[canal] : alphabetSortie[0];
      if (gen() < probabiliteBase) {
        valeur = alphabetSortie[Math.floor(gen() * alphabetSortie.length)];
      }
      sortieMutee.push(valeur);
    }
    tableMutee[cle] = sortieMutee;
  });
  return tableMutee;
}

function individuAleatoire(configuration, graine) {
  // Mirrors individu_aleatoire from ML
  const config = { ...normaliserConfiguration(configuration) };
  config.table_transition = {};
  config.mode_regle = "table"; // GA individuals use table mode, not totalistique/aleatoire
  const cles = toutesClesVoisinage(config.alphabet_entree, config.taille_voisinage);
  const gen = mulberry32(graine);
  cles.forEach((cle) => {
    const sortie = [];
    for (let canal = 0; canal < config.nombre_canaux_sortie; canal += 1) {
      sortie.push(config.alphabet_sortie[Math.floor(gen() * config.alphabet_sortie.length)]);
    }
    config.table_transition[cle] = sortie;
  });
  return config;
}

function individuMutationDepuis(configParent, tauxSur1000, graine) {
  const config = normaliserConfiguration(configParent);
  const cles = toutesClesVoisinage(config.alphabet_entree, config.taille_voisinage);
  const tableMutee = muterTable(config.table_transition, cles,
    config.alphabet_sortie, config.nombre_canaux_sortie, tauxSur1000, graine);
  const configMutee = { ...config };
  configMutee.table_transition = tableMutee;
  configMutee.mode_regle = "table"; // GA individuals use table mode
  return configMutee;
}

function populationInitiale(configBase, taille, graine) {
  const gen = mulberry32(graine);
  const population = [];
  const config = normaliserConfiguration(configBase);
  const moitie = Math.floor(taille / 2);

  for (let i = 0; i < moitie; i += 1) {
    const graineMutation = Math.floor(gen() * 2147483647);
    const individu = individuMutationDepuis(config, 120, graineMutation);
    population.push(individu);
  }

  for (let i = 0; i < taille - moitie; i += 1) {
    const graineAleatoire = Math.floor(gen() * 2147483647);
    const individu = individuAleatoire(config, graineAleatoire);
    population.push(individu);
  }

  return population;
}

function selectionTournoi(scores, k, graine) {
  const gen = mulberry32(graine);
  const candidats = [];
  for (let i = 0; i < Math.min(k, scores.length); i += 1) {
    candidats.push(Math.floor(gen() * scores.length));
  }
  return candidats.reduce((best, idx) => (scores[idx] > scores[best]) ? idx : best);
}

function nouvelleGeneration(population, scores, tauxMutationSur1000, graine) {
  const gen = mulberry32(graine);
  const nouvelle = [];
  const meilleurIdx = scores.reduce((best, score, idx) => (score > scores[best]) ? idx : best, 0);
  nouvelle.push(population[meilleurIdx]);

  for (let i = 0; i < population.length - 1; i += 1) {
    const graineA = Math.floor(gen() * 2147483647);
    const graineB = Math.floor(gen() * 2147483647);
    const idxA = selectionTournoi(scores, 3, graineA);
    const idxB = selectionTournoi(scores, 3, graineB);

    const configA = normaliserConfiguration(population[idxA]);
    const configB = normaliserConfiguration(population[idxB]);

    const graineXover = Math.floor(gen() * 2147483647);
    const tableEnfant = croisementTableUniforme(configA.table_transition,
      configB.table_transition, graineXover);

    const configEnfant = { ...configA };
    configEnfant.table_transition = tableEnfant;

    const graineMut = Math.floor(gen() * 2147483647);
    const configFinal = individuMutationDepuis(configEnfant, tauxMutationSur1000, graineMut);
    nouvelle.push(configFinal);
  }

  return nouvelle;
}

function evaluerFitness(univers, poidsObj) {
  // Computes metrics from univers and returns weighted fitness score
  const lignes = univers && univers.lignes ? univers.lignes : [];
  const totalCells = lignes.length > 0 ? lignes[0].length : 1;
  const liveCells = lignes.flat().filter((v) => v !== 0).length;

  const densite = totalCells > 0 ? liveCells / totalCells : 0;
  const entropie = densite > 0 && densite < 1 ? -(densite * Math.log2(densite) + (1 - densite) * Math.log2(1 - densite)) : 0;
  const compacite = liveCells > 0 ? Math.sqrt(liveCells) / (liveCells + 1) : 0;

  // Placeholder values for oscillation (would require historical data)
  const oscillation = 0;
  const complexite = Math.max(0, entropie * (1 - compacite));
  const croissance = 0; // Would need frame history

  const poids = [
    poidsObj.symetrie || 5,
    poidsObj.densite || 5,
    poidsObj.stabilite || 5,
    poidsObj.oscillation || 5,
    poidsObj.complexite || 5,
    poidsObj.croissance || 5,
  ];

  const fSym = callPacked("fitness_symetrie_scalaire", [0.5], 0.5);
  const fDen = callPacked("fitness_densite_scalaire", [densite, 0.45], Math.abs(densite - 0.45) < 0.2 ? 0.8 : 0.2);
  const fSta = callPacked("fitness_stabilite_scalaire", [0, compacite], compacite * 0.5);
  const fOsc = oscillation;
  const fCmp = callPacked("fitness_complexite_scalaire", [entropie, compacite], complexite);
  const fCro = croissance;

  const score = callPacked("fitness_ponderee_scalaire",
    [fSym, fDen, fSta, fOsc, fCmp, fCro, ...poids],
    (fSym * poids[0] + fDen * poids[1] + fSta * poids[2] + fOsc * poids[3] + fCmp * poids[4] + fCro * poids[5]) /
    poids.reduce((a, b) => a + b, 1)
  );

  return {
    score: Math.max(0, Math.min(1, score)),
    metriques: { entropie, densite, compacite, oscillation, complexite, croissance },
  };
}

function evaluerPopulation(population, poidsObj) {
  return population.map((config) => {
    const univers = genererUnivers(config);
    const evaluation = evaluerFitness(univers, poidsObj);
    return {
      config,
      univers,
      score: evaluation.score,
      metriques: evaluation.metriques,
    };
  });
}

function presetPoidsGenetique(nom) {
  const presets = {
    beau: { symetrie: 8, densite: 5, stabilite: 3, oscillation: 2, complexite: 4, croissance: 1 },
    chaotique: { symetrie: 1, densite: 3, stabilite: 1, oscillation: 2, complexite: 9, croissance: 2 },
    stable: { symetrie: 3, densite: 4, stabilite: 9, oscillation: 1, complexite: 5, croissance: 0 },
    croissance: { symetrie: 2, densite: 3, stabilite: 0, oscillation: 1, complexite: 3, croissance: 9 },
    oscillant: { symetrie: 4, densite: 5, stabilite: 3, oscillation: 9, complexite: 5, croissance: 1 },
  };
  return presets[nom] || presets.beau;
}

// ============================================================================
// PERTURBATION METHODS
// ============================================================================

function appliquerPerturbation(univers, evenement) {
  const { cx, cy, rayon, force, type, graine } = evenement;
  const { configuration, lignes, sorties } = univers;
  const nouvelleLignes = lignes.map(ligne => [...ligne]);
  const nouvellesSorties = sorties ? sorties.map(ligne => [...ligne]) : undefined;
  const rand = mulberry32(graine);
  const alphabet = configuration.alphabet_sortie || configuration.alphabet_entree || [0, 1];

  for (let y = Math.max(0, cy - rayon); y < Math.min(configuration.hauteur, cy + rayon + 1); y++) {
    for (let x = Math.max(0, cx - rayon); x < Math.min(configuration.largeur, cx + rayon + 1); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rayon) continue;

      const intensite = Math.max(0, 1 - (dist / (rayon + 1)));
      const proba = force * intensite;

      if (type === "pulse") {
        if (rand() < proba) {
          nouvelleLignes[y][x] = alphabet[Math.floor(rand() * alphabet.length)];
        }
      } else if (type === "effacer") {
        if (rand() < proba) {
          nouvelleLignes[y][x] = alphabet[0] ?? 0;
        }
      } else if (type === "inverser") {
        if (rand() < proba) {
          const idx = alphabet.indexOf(nouvelleLignes[y][x]);
          const newIdx = idx >= 0 ? (idx + 1) % alphabet.length : 1;
          nouvelleLignes[y][x] = alphabet[newIdx];
        }
      } else if (type === "attirer") {
        if (rand() < proba) {
          const targetIdx = Math.floor(alphabet.length / 2);
          nouvelleLignes[y][x] = alphabet[targetIdx];
        }
      } else if (type === "geler") {
        // Freezing: store the current cell value in a freeze mask (handled in app.mjs)
        if (rand() < proba * 0.5) {
          const key = `${x},${y}`;
          perturbState?.masqueGel?.set(key, { valeur: nouvelleLignes[y][x], restant: Math.floor(proba * 10) + 1 });
        }
      } else if (type === "muter") {
        if (rand() < proba) {
          const idx = alphabet.indexOf(nouvelleLignes[y][x]);
          if (idx >= 0) {
            const nextIdx = (idx + 1) % alphabet.length;
            if (rand() < 0.5 && idx > 0) {
              nouvelleLignes[y][x] = alphabet[idx - 1];
            } else if (nextIdx < alphabet.length) {
              nouvelleLignes[y][x] = alphabet[nextIdx];
            }
          } else {
            nouvelleLignes[y][x] = alphabet[1] ?? alphabet[0];
          }
        }
      }
    }
  }

  return {
    configuration,
    lignes: nouvelleLignes,
    sorties: nouvellesSorties,
  };
}

function appliquerMasqueGel(lignes) {
  // Returns lignes with frozen cells locked
  return lignes;
}

function decrementerMasqueGel(masqueGel) {
  const masqueNouveau = {};
  Object.entries(masqueGel).forEach(([cle, compte]) => {
    if (compte - 1 > 0) {
      masqueNouveau[cle] = compte - 1;
    }
  });
  return masqueNouveau;
}

function calculerCentreDesMasse(ligne) {
  const vivants = ligne.map((v, idx) => (v !== 0 ? idx : -1)).filter((idx) => idx >= 0);
  if (vivants.length === 0) return ligne.length / 2;
  return vivants.reduce((a, b) => a + b, 0) / vivants.length;
}

function metriquesUnivers(univers) {
  const lignes = univers && univers.lignes ? univers.lignes : [];
  const totalCells = lignes.length > 0 ? lignes[0].length : 1;
  const liveCells = lignes.flat().filter((v) => v !== 0).length;
  const densite = totalCells > 0 ? liveCells / totalCells : 0;
  const entropie = densite > 0 && densite < 1 ? -(densite * Math.log2(densite) + (1 - densite) * Math.log2(1 - densite)) : 0;
  const compacite = liveCells > 0 ? Math.sqrt(liveCells) / (liveCells + 1) : 0;
  const symetrie = 0.5; // Placeholder
  const tauxCroissance = 0; // Placeholder
  return { entropie, compacite, symetrie, tauxCroissance, densite };
}

window.AutomaginariumCore = {
  genererUnivers,
  normaliserConfiguration,
  tableWolfram,
  cleVoisinage,
  toutesClesVoisinage,
  validerConfiguration,
  ruleConfiguration,
  getRuleOutput,
  codeVoisinageNumerique,
  mulberry32,
  callPacked,
  // Genetic
  croisementTableUniforme,
  muterTable,
  individuAleatoire,
  individuMutationDepuis,
  populationInitiale,
  selectionTournoi,
  nouvelleGeneration,
  evaluerFitness,
  evaluerPopulation,
  presetPoidsGenetique,
  // Perturbation
  appliquerPerturbation,
  appliquerMasqueGel,
  decrementerMasqueGel,
  calculerCentreDesMasse,
  metriquesUnivers,
};
