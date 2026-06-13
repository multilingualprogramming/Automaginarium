import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

global.window = global;
global.AutomaginariumUniversVivant = null;
const require = createRequire(import.meta.url);
require("../public/automate-core.js");

const generated = await import(pathToFileURL(
  path.join(root, "public", "generated", "automate_universel", "browser_module.mjs"),
).href);

function compareUniverse(label, config) {
  const fallbackUniverse = global.AutomaginariumCore.genererUnivers(config);
  const generatedUniverse = generated.generer_univers_detaille(config);
  assert.deepEqual(generatedUniverse.lignes, fallbackUniverse.lignes, `${label}: lignes`);
  assert.deepEqual(generatedUniverse.sorties, fallbackUniverse.sorties, `${label}: sorties`);
}

function assertClose(actual, expected, label, epsilon = 1e-12) {
  assert(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
}

const binaryWolfram = {
  nom: "Parity Wolfram",
  alphabet_entree: [0, 1],
  alphabet_sortie: [0, 1],
  taille_voisinage: 3,
  nombre_canaux_sortie: 1,
  mode_regle: "table",
  table_transition: generated.table_wolfram(90),
  largeur: 15,
  hauteur: 8,
  frontiere: "circulaire",
  etat_initial: { mode: "centre" },
  rendu: { taille_cellule: 4 },
};

const totalisticMultiChannel = {
  nom: "Parity totalistique",
  alphabet_entree: [0, 1, 2],
  alphabet_sortie: [0, 1, 2, 3],
  taille_voisinage: 5,
  nombre_canaux_sortie: 3,
  mode_regle: "totalistique",
  largeur: 13,
  hauteur: 7,
  frontiere: "fixe",
  etat_initial: { mode: "motif", valeurs: [0, 1, 2, 1, 0] },
};
totalisticMultiChannel.table_transition = generated.table_totalistique(totalisticMultiChannel);

const symbolicAlphabet = {
  nom: "Parity symboles",
  alphabet_entree: ["sol", "graine"],
  alphabet_sortie: ["sol", "graine", "tige", "fleur"],
  taille_voisinage: 3,
  nombre_canaux_sortie: 2,
  mode_regle: "table",
  table_transition: {
    "[\"sol\",\"sol\",\"sol\"]": ["sol", "sol"],
    "[\"sol\",\"sol\",\"graine\"]": ["graine", "tige"],
    "[\"sol\",\"graine\",\"sol\"]": ["tige", "fleur"],
    "[\"sol\",\"graine\",\"graine\"]": ["fleur", "fleur"],
    "[\"graine\",\"sol\",\"sol\"]": ["graine", "tige"],
    "[\"graine\",\"sol\",\"graine\"]": ["tige", "fleur"],
    "[\"graine\",\"graine\",\"sol\"]": ["fleur", "tige"],
    "[\"graine\",\"graine\",\"graine\"]": ["sol", "fleur"],
  },
  largeur: 11,
  hauteur: 6,
  frontiere: "circulaire",
  etat_initial: { mode: "motif", valeurs: ["graine", "sol", "graine"] },
};

compareUniverse("binary Wolfram", binaryWolfram);
compareUniverse("totalistic multi-channel", totalisticMultiChannel);
compareUniverse("symbolic alphabet", symbolicAlphabet);

assert.equal(Object.keys(generated.table_aleatoire(binaryWolfram, 17)).length, 8, "generated random table size");
assert.deepEqual(
  generated.table_symetrique(binaryWolfram, 17)["[0,1,1]"],
  generated.table_symetrique(binaryWolfram, 17)["[1,1,0]"],
  "generated symmetric table mirrors keys",
);

const fallbackPerturbed = global.AutomaginariumCore.appliquerPerturbation(
  global.AutomaginariumCore.genererUnivers(binaryWolfram),
  { cx: 7, cy: 4, rayon: 2, force: 1, type: "inverser", graine: 123 },
);
const generatedPerturbed = generated.appliquer_perturbation(
  generated.generer_univers_detaille(binaryWolfram),
  { cx: 7, cy: 4, rayon: 2, force: 1, type: "inverser", graine: 123 },
);
assert.deepEqual(generatedPerturbed.lignes, fallbackPerturbed.lignes, "perturbation lignes");
assert.deepEqual(generatedPerturbed.sorties, fallbackPerturbed.sorties, "perturbation sorties");

const generatedPopulation = generated.population_initiale(binaryWolfram, 6, 19);
const fallbackPopulation = global.AutomaginariumCore.populationInitiale(binaryWolfram, 6, 19);
assert.equal(generatedPopulation.length, fallbackPopulation.length, "genetic population length");
assert(generatedPopulation.every((config) => generated.valider_configuration(config).valide), "generated population validates");
assert(fallbackPopulation.every((config) => global.AutomaginariumCore.validerConfiguration(config).valide), "fallback population validates");

const weights = generated.preset_poids_genetique("beau");
assert.deepEqual(weights, global.AutomaginariumCore.presetPoidsGenetique("beau"), "genetic weights");
const generatedEvaluation = generated.evaluer_population([binaryWolfram, totalisticMultiChannel, symbolicAlphabet], weights);
const fallbackEvaluation = global.AutomaginariumCore.evaluerPopulation([binaryWolfram, totalisticMultiChannel, symbolicAlphabet], weights);
assert.equal(generatedEvaluation.length, fallbackEvaluation.length, "genetic evaluation length");
generatedEvaluation.forEach((entry, index) => {
  const fallbackEntry = fallbackEvaluation[index];
  assertClose(entry.score, fallbackEntry.score, `genetic evaluation ${index} score`);
  for (const key of ["entropie", "densite", "compacite", "symetrie", "oscillation", "complexite", "croissance", "tauxCroissance"]) {
    assertClose(entry.metriques[key], fallbackEntry.metriques[key], `genetic evaluation ${index} ${key}`);
  }
  assert.deepEqual(entry.metriques.scores_par_canal, fallbackEntry.metriques.scores_par_canal);
});

console.log("generated parity smoke ok");
