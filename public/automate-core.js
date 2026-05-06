/*
 * Automaginarium browser bridge.
 *
 * This adapter forwards calls to the compiled French Multilingual core.
 * All domain logic (cellular automata, rules, generation) is canonical in
 * src/automate_universel.multi. These functions are temporary fallbacks/mirrors
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
// TEMPORARY: These functions are duplicated from src/automate_universel.multi.
// They are fallbacks until the ML is compiled to WASM/JS.
// DO NOT ADD NEW LOGIC HERE. Update src/automate_universel.multi instead.
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

function deterministicSymbolIndex(seed, identifier, alphabetSize) {
  const fallback = (() => {
    const base = seed + 12345;
    const mixed = (base + (identifier * 1103515245)) % 2147483647;
    return alphabetSize <= 0 ? 0 : Math.abs(mixed) % alphabetSize;
  })();
  return callPacked(
    "indice_aleatoire_deterministe",
    [seed, identifier, alphabetSize],
    fallback,
  );
}

function randomOutput(configuration, seed, neighborhoodIndex) {
  return Array.from({ length: configuration.nombre_canaux_sortie }, (_, channel) => {
    const symbolIndex = deterministicSymbolIndex(
      seed,
      (neighborhoodIndex * 31) + channel,
      configuration.alphabet_sortie.length,
    );
    return configuration.alphabet_sortie[symbolIndex];
  });
}

function tableAleatoire(configurationBrute, seed = Date.now() >>> 0) {
  const configuration = normaliserConfiguration(configurationBrute);
  const keys = toutesClesVoisinage(configuration.alphabet_entree, configuration.taille_voisinage);
  return Object.fromEntries(keys.map((key, index) => [key, randomOutput(configuration, seed, index)]));
}

function tableSymetrique(configurationBrute, seed = Date.now() >>> 0) {
  const configuration = normaliserConfiguration(configurationBrute);
  const table = {};
  const keys = toutesClesVoisinage(configuration.alphabet_entree, configuration.taille_voisinage);
  keys.forEach((key, index) => {
    if (table[key]) return;
    const voisinage = JSON.parse(key);
    const miroir = cleVoisinage(voisinage.slice().reverse());
    const output = randomOutput(configuration, seed, index);
    table[key] = output;
    table[miroir] = output;
  });
  return table;
}

function tableTotalistique(configurationBrute) {
  const configuration = normaliserConfiguration(configurationBrute);
  const keys = toutesClesVoisinage(configuration.alphabet_entree, configuration.taille_voisinage);
  return Object.fromEntries(keys.map((key) => {
    const voisinage = JSON.parse(key);
    const sum = voisinage.reduce((acc, value) => acc + Number(value), 0);
    const output = Array.from({ length: configuration.nombre_canaux_sortie }, (_, channel) => {
      const fallback = Number.isFinite(sum)
        ? ((sum % configuration.alphabet_sortie.length) + channel + configuration.alphabet_sortie.length) % configuration.alphabet_sortie.length
        : (voisinage.length + channel) % configuration.alphabet_sortie.length;
      const index = callPacked(
        "sortie_totalistique",
        [sum, configuration.alphabet_sortie.length, channel],
        fallback,
      );
      return configuration.alphabet_sortie[index];
    });
    return [key, output];
  }));
}

function ensureRenderableConfiguration(configurationBrute) {
  const normalized = normaliserConfiguration(configurationBrute);
  if (!normalized.table_transition || Object.keys(normalized.table_transition).length === 0) {
    const cles = toutesClesVoisinage(normalized.alphabet_entree, normalized.taille_voisinage);
    normalized.table_transition = {};
    cles.slice(0, Math.min(5, cles.length)).forEach((cle) => {
      normalized.table_transition[cle] = [normalized.alphabet_sortie[0]];
    });
  }
  return normalized;
}

function buildGeneratedRuleConfig(configurationBrute, generator, wolframRule) {
  const config = normaliserConfiguration(configurationBrute);
  let effectiveGenerator = generator;
  const isBinaryAlphabet = config.alphabet_entree.length === 2
    && String(config.alphabet_entree[0]) === "0"
    && String(config.alphabet_entree[1]) === "1";
  if (effectiveGenerator === "wolfram" && (config.taille_voisinage !== 3 || !isBinaryAlphabet || config.nombre_canaux_sortie !== 1)) {
    effectiveGenerator = "random";
  }
  if (effectiveGenerator === "wolfram") {
    config.alphabet_entree = [0, 1];
    config.alphabet_sortie = [0, 1];
    config.taille_voisinage = 3;
    config.nombre_canaux_sortie = 1;
    config.mode_regle = "table";
    config.table_transition = tableWolfram(Number(wolframRule || 90));
  } else if (effectiveGenerator === "random") {
    config.mode_regle = "table";
    config.table_transition = tableAleatoire(config);
  } else if (effectiveGenerator === "symmetric") {
    config.mode_regle = "table";
    config.table_transition = tableSymetrique(config);
  } else if (effectiveGenerator === "totalistic") {
    config.mode_regle = "totalistique";
    config.table_transition = tableTotalistique(config);
  }
  return { config, effectiveGenerator };
}

function croisementTableUniforme(tableA, tableB, graine) {
  const gen = mulberry32(graine);
  const clesUnion = new Set([...Object.keys(tableA), ...Object.keys(tableB)]);
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
  const probabiliteBase = tauxSur1000 / 1000.0;
  const tableMutee = {};
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

function individuAleatoire(configurationBrute, graine) {
  const configuration = normaliserConfiguration(configurationBrute);
  return {
    ...configuration,
    mode_regle: "table",
    table_transition: tableAleatoire(configuration, graine),
  };
}

function parseSymbol(raw) {
  const trimmed = String(raw ?? "").trim();
  if (trimmed === "") return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && String(numeric) === trimmed ? numeric : trimmed;
}

function parseCommaList(value, fallback) {
  const parsed = String(value ?? "").split(",").map(parseSymbol).filter((item) => item !== null);
  return parsed.length > 0 ? parsed : fallback;
}

function encodeList(values) {
  return (values || []).join(",");
}

function formStateToConfig(formState, currentConfig = {}) {
  const inputAlphabet = parseCommaList(formState.alphabetInput, [0, 1]);
  const outputAlphabet = parseCommaList(formState.alphabetOutput, inputAlphabet);
  let neighborhood = Number(formState.neighborhood || 3);
  if (neighborhood % 2 === 0) neighborhood += 1;
  const initialMode = formState.initialMode || "centre";
  const config = {
    ...currentConfig,
    nom: String(formState.name || "").trim() || "Univers sans nom",
    alphabet_entree: inputAlphabet,
    alphabet_sortie: outputAlphabet,
    taille_voisinage: Math.max(1, neighborhood),
    nombre_canaux_sortie: Math.max(1, Number(formState.channels || 1)),
    largeur: Math.max(1, Number(formState.width || 161)),
    hauteur: Math.max(1, Number(formState.height || 100)),
    frontiere: formState.boundary || "fixe",
    mode_regle: formState.ruleMode || "table",
    numero_regle: formState.ruleNumber || "0",
    etat_initial: { mode: initialMode },
    rendu: {
      ...(currentConfig.rendu || {}),
      taille_cellule: Math.max(1, Number(formState.cellSize || 5)),
    },
  };
  if (initialMode === "motif") {
    config.etat_initial.valeurs = parseCommaList(formState.initialValues, [outputAlphabet[1] ?? outputAlphabet[0]]);
  }
  if (initialMode === "aleatoire") {
    config.etat_initial.graine = currentConfig.etat_initial?.graine ?? 42;
    config.etat_initial.probabilite = Math.max(0, Math.min(1, Number(formState.initialProbability || 0.28)));
  }
  const alphabetChanged = currentConfig.alphabet_entree && (
    currentConfig.alphabet_entree.length !== inputAlphabet.length ||
    currentConfig.taille_voisinage !== neighborhood ||
    currentConfig.nombre_canaux_sortie !== config.nombre_canaux_sortie
  );
  if (alphabetChanged) {
    config.table_transition = {};
  } else if (!config.table_transition) {
    config.table_transition = {};
  }
  return config;
}

function configToFormState(config) {
  return {
    name: config.nom || "",
    alphabetInput: encodeList(config.alphabet_entree || [0, 1]),
    alphabetOutput: encodeList(config.alphabet_sortie || config.alphabet_entree || [0, 1]),
    neighborhood: String(config.taille_voisinage || 3),
    channels: String(config.nombre_canaux_sortie || 1),
    width: String(config.largeur || 161),
    height: String(config.hauteur || 100),
    boundary: config.frontiere || "fixe",
    initialMode: config.etat_initial?.mode || "centre",
    initialValues: encodeList(config.etat_initial?.valeurs || []),
    initialProbability: String(config.etat_initial?.probabilite ?? 0.28),
    cellSize: String(config.rendu?.taille_cellule || 5),
    ruleMode: config.mode_regle || "table",
    ruleNumber: config.numero_regle ? String(config.numero_regle) : "0",
    json: JSON.stringify({ ...config, numero_regle: String(config.numero_regle || 0n) }, null, 2),
  };
}

function individuMutationDepuis(configurationBrute, tauxSur1000, graine) {
  const configuration = normaliserConfiguration(configurationBrute);
  const cles = toutesClesVoisinage(configuration.alphabet_entree, configuration.taille_voisinage);
  return {
    ...configuration,
    mode_regle: "table",
    table_transition: muterTable(
      configuration.table_transition,
      cles,
      configuration.alphabet_sortie,
      configuration.nombre_canaux_sortie,
      tauxSur1000,
      graine,
    ),
  };
}

function populationInitiale(configBase, taille, graine) {
  const gen = mulberry32(graine);
  const population = [];
  const config = normaliserConfiguration(configBase);
  const moitie = Math.floor(taille / 2);
  for (let i = 0; i < moitie; i += 1) {
    population.push(individuMutationDepuis(config, 120, Math.floor(gen() * 2147483647)));
  }
  for (let i = 0; i < taille - moitie; i += 1) {
    population.push(individuAleatoire(config, Math.floor(gen() * 2147483647)));
  }
  return population;
}

function selectionTournoi(scores, tailleTournoi, graine) {
  const gen = mulberry32(graine);
  const candidats = [];
  for (let i = 0; i < Math.min(tailleTournoi, scores.length); i += 1) {
    candidats.push(Math.floor(gen() * scores.length));
  }
  return candidats.reduce((best, idx) => (scores[idx] > scores[best] ? idx : best));
}

function nouvelleGeneration(population, scores, tauxMutationSur1000, graine) {
  const gen = mulberry32(graine);
  const nouvelle = [];
  const meilleurIdx = scores.reduce((best, score, idx) => (score > scores[best] ? idx : best), 0);
  nouvelle.push(population[meilleurIdx]);
  for (let i = 0; i < population.length - 1; i += 1) {
    const idxA = selectionTournoi(scores, 3, Math.floor(gen() * 2147483647));
    const idxB = selectionTournoi(scores, 3, Math.floor(gen() * 2147483647));
    const configA = normaliserConfiguration(population[idxA]);
    const configB = normaliserConfiguration(population[idxB]);
    const tableEnfant = croisementTableUniforme(
      configA.table_transition,
      configB.table_transition,
      Math.floor(gen() * 2147483647),
    );
    const configEnfant = { ...configA, table_transition: tableEnfant };
    nouvelle.push(individuMutationDepuis(configEnfant, tauxMutationSur1000, Math.floor(gen() * 2147483647)));
  }
  return nouvelle;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function celluleVivante(value, valeurVide) {
  return String(value) !== String(valeurVide);
}

function calculerDensiteLigne(ligne, valeurVide) {
  if (!ligne || ligne.length === 0) return 0;
  return ligne.filter((value) => celluleVivante(value, valeurVide)).length / ligne.length;
}

function calculerSymetrieLigne(ligne) {
  if (!ligne || ligne.length <= 1) return 1;
  let accords = 0;
  const paires = Math.floor(ligne.length / 2);
  for (let i = 0; i < paires; i += 1) {
    if (String(ligne[i]) === String(ligne[ligne.length - 1 - i])) accords += 1;
  }
  return paires > 0 ? accords / paires : 1;
}

function calculerCompaciteLigne(ligne, valeurVide) {
  if (!ligne || ligne.length === 0) return 0;
  const indicesVivants = ligne
    .map((value, index) => (celluleVivante(value, valeurVide) ? index : -1))
    .filter((index) => index >= 0);
  if (indicesVivants.length === 0) return 0;
  const debut = indicesVivants[0];
  const fin = indicesVivants[indicesVivants.length - 1];
  return indicesVivants.length / Math.max(1, fin - debut + 1);
}

function varianceDensite(historiqueDensites) {
  if (!historiqueDensites || historiqueDensites.length < 2) return 0;
  const moyenne = historiqueDensites.reduce((sum, value) => sum + value, 0) / historiqueDensites.length;
  const sommeCarres = historiqueDensites.reduce((sum, value) => sum + ((value - moyenne) ** 2), 0);
  return Math.sqrt(sommeCarres / historiqueDensites.length);
}

function detecterPeriode(historiqueDensites, fenetre) {
  if (!historiqueDensites || historiqueDensites.length < fenetre || fenetre < 2) return 0;
  const derniers = historiqueDensites.slice(-fenetre);
  for (let periode = 1; periode <= Math.floor(fenetre / 2); periode += 1) {
    let correlation = 0;
    let compte = 0;
    for (let i = 0; i < derniers.length - periode; i += 1) {
      correlation += Math.abs(derniers[i] - derniers[i + periode]);
      compte += 1;
    }
    const correlationMoyenne = compte > 0 ? correlation / compte : 0;
    if (correlationMoyenne < 0.1) return periode;
  }
  return 0;
}

function metriquesUnivers(univers) {
  const lignes = univers?.lignes || [];
  const configuration = univers?.configuration || {};
  const valeurVide = configuration.alphabet_entree ? configuration.alphabet_entree[0] : 0;
  const totalCells = lignes.reduce((sum, ligne) => sum + ligne.length, 0);
  const liveCells = lignes.flat().filter((value) => celluleVivante(value, valeurVide)).length;
  const densite = totalCells > 0 ? liveCells / totalCells : 0;
  const entropie = densite > 0 && densite < 1 ? -(densite * Math.log2(densite) + (1 - densite) * Math.log2(1 - densite)) : 0;
  const densitesParGeneration = lignes.map((ligne) => calculerDensiteLigne(ligne, valeurVide));
  const compacites = lignes.map((ligne) => calculerCompaciteLigne(ligne, valeurVide));
  const symetries = lignes.map(calculerSymetrieLigne);
  const compacite = compacites.length > 0 ? compacites.reduce((sum, value) => sum + value, 0) / compacites.length : 0;
  const symetrie = symetries.length > 0 ? symetries.reduce((sum, value) => sum + value, 0) / symetries.length : 0.5;
  const tranche = Math.max(1, Math.floor(densitesParGeneration.length / 5));
  const densiteDebut = densitesParGeneration.slice(0, tranche).reduce((sum, value) => sum + value, 0) / tranche;
  const densiteFin = densitesParGeneration.slice(-tranche).reduce((sum, value) => sum + value, 0) / tranche;
  const tauxCroissance = Math.max(-1, Math.min(1, densiteFin - densiteDebut));
  const variance = clamp01(varianceDensite(densitesParGeneration) * 4);
  const periodeDetectee = detecterPeriode(densitesParGeneration, Math.min(24, densitesParGeneration.length));
  const scoreVariance = 1 - Math.min(1, Math.abs(variance - 0.5) * 2);
  const scorePeriode = periodeDetectee > 0 ? 1 : 0;
  const oscillation = clamp01((scoreVariance * 0.7) + (scorePeriode * 0.3));
  const complexite = clamp01(entropie * (1 - compacite));
  return {
    entropie,
    compacite,
    symetrie,
    tauxCroissance,
    densite,
    oscillation,
    complexite,
    varianceDensite: variance,
    periodeDetectee,
  };
}

function evaluerFitness(univers, poidsObj = {}) {
  const { entropie, densite, compacite, symetrie, oscillation, complexite, tauxCroissance } = metriquesUnivers(univers);
  const poids = [
    poidsObj.symetrie || 5,
    poidsObj.densite || 5,
    poidsObj.stabilite || 5,
    poidsObj.oscillation || 5,
    poidsObj.complexite || 5,
    poidsObj.croissance || 5,
  ];
  const fSym = callPacked("fitness_symetrie_scalaire", [symetrie], symetrie);
  const fDen = callPacked("fitness_densite_scalaire", [densite, 0.45], Math.abs(densite - 0.45) < 0.2 ? 0.8 : 0.2);
  const fSta = callPacked("fitness_stabilite_scalaire", [Math.abs(tauxCroissance), compacite], ((1 - Math.abs(tauxCroissance)) * 0.5) + (compacite * 0.5));
  const fCmp = callPacked("fitness_complexite_scalaire", [entropie, compacite], complexite);
  const fCro = callPacked("fitness_croissance_scalaire", [Math.max(0, tauxCroissance)], Math.max(0, tauxCroissance));
  const score = callPacked(
    "fitness_ponderee_scalaire",
    [fSym, fDen, fSta, oscillation, fCmp, fCro, ...poids],
    (fSym * poids[0] + fDen * poids[1] + fSta * poids[2] + oscillation * poids[3] + fCmp * poids[4] + fCro * poids[5]) /
      poids.reduce((a, b) => a + b, 1),
  );
  const configuration = univers?.configuration || {};
  const scoresParCanal = Array.from(
    { length: Math.max(1, Number(configuration.nombre_canaux_sortie || 1)) },
    () => clamp01(score),
  );
  return {
    score: clamp01(score),
    metriques: {
      entropie,
      densite,
      compacite,
      symetrie,
      oscillation,
      complexite,
      croissance: Math.max(0, tauxCroissance),
      tauxCroissance,
      scores_par_canal: scoresParCanal,
    },
  };
}

function evaluerPopulation(population, poidsObj = {}) {
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

function appliquerPerturbation(univers, evenement) {
  const { cx, cy, rayon, force, type, graine } = evenement;
  const { configuration, lignes, sorties } = univers;
  const nouvelleLignes = lignes.map((ligne) => [...ligne]);
  const nouvellesSorties = sorties ? sorties.map((ligne) => [...ligne]) : undefined;
  const rand = mulberry32(graine);
  const alphabet = configuration.alphabet_sortie || configuration.alphabet_entree || [0, 1];
  for (let y = Math.max(0, cy - rayon); y < Math.min(configuration.hauteur, cy + rayon + 1); y += 1) {
    for (let x = Math.max(0, cx - rayon); x < Math.min(configuration.largeur, cx + rayon + 1); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt((dx * dx) + (dy * dy));
      if (dist > rayon) continue;
      const intensite = Math.max(0, 1 - (dist / (rayon + 1)));
      const proba = force * intensite;
      if (type === "pulse") {
        if (rand() < proba) nouvelleLignes[y][x] = alphabet[Math.floor(rand() * alphabet.length)];
      } else if (type === "effacer" || type === "geler") {
        if (rand() < proba) nouvelleLignes[y][x] = alphabet[0] ?? 0;
      } else if (type === "inverser") {
        if (rand() < proba) {
          const idx = alphabet.indexOf(nouvelleLignes[y][x]);
          nouvelleLignes[y][x] = alphabet[idx >= 0 ? (idx + 1) % alphabet.length : 1];
        }
      } else if (type === "attirer") {
        if (rand() < proba) nouvelleLignes[y][x] = alphabet[Math.floor(alphabet.length / 2)];
      } else if (type === "muter") {
        if (rand() < proba) {
          const idx = alphabet.indexOf(nouvelleLignes[y][x]);
          if (idx >= 0) {
            const nextIdx = (idx + 1) % alphabet.length;
            nouvelleLignes[y][x] = rand() < 0.5 && idx > 0 ? alphabet[idx - 1] : alphabet[nextIdx];
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

function summarizeConfig(configuration) {
  return `${configuration.largeur} x ${configuration.hauteur} cellules, ${configuration.alphabet_sortie.length} etat(s) visibles, voisinage ${configuration.taille_voisinage}, depart ${configuration.etat_initial?.mode || "centre"}`;
}

function summarizeTransition(configuration) {
  const entries = Object.entries(configuration.table_transition || {});
  if (configuration.mode_regle === "totalistique") {
    return `Mode totalistique avec ${configuration.alphabet_sortie.length} etat(s) de sortie.`;
  }
  if (entries.length === 0) {
    return `Mode ${configuration.mode_regle} pilote par le noyau sans table explicite.`;
  }
  return `${entries.length} transition(s) actives dans la table en cours.`;
}

function universeHudMetrics(univers) {
  const { configuration, lignes } = univers;
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
  return {
    generations: configuration.hauteur,
    density,
    entropy,
  };
}

function randomRuleNumber(max, seed = Date.now() >>> 0) {
  const bits = max.toString(2).length;
  const words = Math.ceil(bits / 32) + 1;
  const random = mulberry32(seed);
  let value = 0n;
  for (let index = 0; index < words; index += 1) {
    value = (value << 32n) | BigInt(Math.floor(random() * 0x100000000));
  }
  return value % max;
}

function hudRuleLabel(ruleState) {
  const neighborhood = Number(ruleState.neighborhood || 3);
  const channels = Number(ruleState.channels || 1);
  const ruleMode = ruleState.ruleMode || "table";
  const wolframRule = ruleState.wolframRule || "90";
  if (ruleMode === "totalistique") return `Tot(${neighborhood})`;
  if (ruleMode === "aleatoire") return `Alea(${neighborhood})`;
  if (ruleMode === "numerique") return `R${neighborhood}x${channels}`;
  if (ruleMode === "table") return `T${neighborhood}x${channels}`;
  return wolframRule;
}

function describeConfiguration(configuration) {
  const entries = Object.entries(configuration.table_transition || {});
  const visibleEntries = entries.slice(0, 24);
  return {
    title: configuration.nom,
    metaText: `${configuration.alphabet_entree.length} symbole(s) entree | ${configuration.alphabet_sortie.length} sortie | voisinage ${configuration.taille_voisinage} | ${configuration.nombre_canaux_sortie} canal(aux) | ${configuration.mode_regle}`,
    ruleTableHtml: visibleEntries.length > 0
      ? visibleEntries.map(([key, value]) => `<span><b>${key}</b> -> ${JSON.stringify(value)}</span>`).join("")
      : `<span><b>${configuration.mode_regle}</b> -> genere par le noyau</span>`,
  };
}

function transitionSignalEntries(configuration, limit = 6) {
  const entries = Object.entries(configuration.table_transition || {}).slice(0, limit);
  if (entries.length === 0) {
    return [{
      label: configuration.mode_regle,
      title: "Noyau dynamique",
      body: "Les sorties sont derivees sans table visible.",
    }];
  }
  return entries.map(([key, value], index) => ({
    label: `Transition ${index + 1}`,
    title: key,
    body: JSON.stringify(value),
  }));
}

function ruleSpaceLabel(configuration) {
  const { s, k, t, m, maxRule } = ruleConfiguration(configuration);
  return `${t}^(${m}·${s}^${k}) = ${maxRule} regles possibles`;
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


window.AutomaginariumCore = {
  genererUnivers,
  normaliserConfiguration,
  tableWolfram,
  tableAleatoire,
  tableSymetrique,
  tableTotalistique,
  populationInitiale,
  nouvelleGeneration,
  evaluerPopulation,
  presetPoidsGenetique,
  appliquerPerturbation,
  parseCommaList,
  encodeList,
  formStateToConfig,
  configToFormState,
  ensureRenderableConfiguration,
  buildGeneratedRuleConfig,
  hudRuleLabel,
  describeConfiguration,
  transitionSignalEntries,
  ruleSpaceLabel,
  summarizeConfig,
  summarizeTransition,
  universeHudMetrics,
  randomRuleNumber,
  cleVoisinage,
  toutesClesVoisinage,
  validerConfiguration,
  ruleConfiguration,
  getRuleOutput,
  codeVoisinageNumerique,
  mulberry32,
  callPacked,
};
