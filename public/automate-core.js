/*
 * Automaginarium browser adapter.
 *
 * This small JavaScript mirror keeps the Stage 2 demo usable until
 * src/automate_universel.ml is compiled through Multilingual. JavaScript
 * should remain an adapter: configuration in, generated universe out.
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
    frontiere: configuration.frontiere || "fixe",
    valeur_frontiere: configuration.valeur_frontiere ?? alphabetEntree[0],
    largeur: Math.max(1, Number(configuration.largeur || 161)),
    hauteur: Math.max(1, Number(configuration.hauteur || 100)),
    etat_initial: configuration.etat_initial || { mode: "centre" },
    rendu: configuration.rendu || {},
  };
}

function cleVoisinage(voisinage) {
  return JSON.stringify(voisinage);
}

function ancienneCleVoisinage(voisinage) {
  return voisinage.map(String).join("");
}

function sortieDefaut(configuration) {
  return Array.from({ length: configuration.nombre_canaux_sortie }, () => configuration.alphabet_sortie[0] ?? 0);
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

function appliquerRegle(voisinage, configuration, random) {
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
    Array.from({ length: configuration.nombre_canaux_sortie }, (_, channel) => (channel === 0 ? value : configuration.alphabet_sortie[0]))
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

function codeVoisinageNumerique(voisinage, tailleAlphabet) {
  if (!voisinage.every((value) => Number.isInteger(Number(value)))) return null;
  const values = voisinage.map(Number);
  if (values.length === 3) {
    return Math.trunc(callPacked(
      "code_voisinage_3_base",
      [values[0], values[1], values[2], tailleAlphabet],
      values.reduce((code, value) => code * tailleAlphabet + value, 0),
    ));
  }
  if (values.length === 5) {
    return Math.trunc(callPacked(
      "code_voisinage_5_base",
      [values[0], values[1], values[2], values[3], values[4], tailleAlphabet],
      values.reduce((code, value) => code * tailleAlphabet + value, 0),
    ));
  }
  return values.reduce((code, value) => code * tailleAlphabet + value, 0);
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

function normaliserSortie(sortie, configuration) {
  const valeurs = Array.isArray(sortie) ? [...sortie] : [sortie];
  while (valeurs.length < configuration.nombre_canaux_sortie) valeurs.push(valeurs[0] ?? configuration.alphabet_sortie[0]);
  return valeurs.slice(0, configuration.nombre_canaux_sortie);
}

function validerConfiguration(configurationBrute) {
  const config = normaliserConfiguration(configurationBrute);
  const erreurs = [];
  const avertissements = [];
  if (!Array.isArray(config.alphabet_entree) || config.alphabet_entree.length === 0) erreurs.push("alphabet_entree vide");
  if (!Array.isArray(config.alphabet_sortie) || config.alphabet_sortie.length === 0) erreurs.push("alphabet_sortie vide");
  if (config.taille_voisinage < 1 || config.taille_voisinage % 2 === 0) erreurs.push("taille_voisinage doit etre impair et positif");
  if (!["table", "totalistique", "aleatoire"].includes(config.mode_regle)) erreurs.push("mode_regle inconnu");
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
  cleVoisinage,
  toutesClesVoisinage,
  validerConfiguration,
  codeVoisinageNumerique,
};
