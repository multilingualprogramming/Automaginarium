const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../public/automate-core.js");

function loadExample(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", name), "utf8"));
}

function testCanonicalKeys() {
  assert.equal(AutomaginariumCore.cleVoisinage([0, 1, 0]), "[0,1,0]");
  assert.equal(AutomaginariumCore.cleVoisinage(["air", "feu", "air"]), "[\"air\",\"feu\",\"air\"]");
  const keys = AutomaginariumCore.toutesClesVoisinage(["a", "aa"], 2);
  assert(keys.includes("[\"a\",\"aa\"]"));
  assert(keys.includes("[\"aa\",\"a\"]"));
}

function testWolfram90() {
  const table = AutomaginariumCore.tableWolfram(90);
  assert.deepEqual(table["[1,1,1]"], [0]);
  assert.deepEqual(table["[1,1,0]"], [1]);
  assert.deepEqual(table["[0,0,1]"], [1]);
  assert.deepEqual(table["[0,0,0]"], [0]);
}

function testBackwardCompatibility() {
  const universe = AutomaginariumCore.genererUnivers({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
    table_transition: { "010": [1] },
    largeur: 5,
    hauteur: 2,
    etat_initial: { mode: "centre" },
  });
  assert.deepEqual(universe.lignes[1], [0, 0, 1, 0, 0]);
}

function testMultiChannel() {
  const universe = AutomaginariumCore.genererUnivers({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
    mode_regle: "totalistique",
    largeur: 7,
    hauteur: 4,
    etat_initial: { mode: "centre" },
  });
  assert.equal(universe.lignes.length, 4);
  assert.equal(universe.sorties[1][3].length, 2);
}

function testExamplesValidate() {
  for (const file of fs.readdirSync(path.join(__dirname, "..", "examples"))) {
    if (!file.endsWith(".json") || file === "schema.json") continue;
    const config = loadExample(file);
    const validation = AutomaginariumCore.validerConfiguration(config);
    assert.equal(validation.valide, true, `${file}: ${validation.erreurs.join(", ")}`);
    const universe = AutomaginariumCore.genererUnivers(config);
    assert.equal(universe.lignes.length, config.hauteur);
  }
}

function testCanonicalRuleGenerators() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
    mode_regle: "table",
  };
  const random = AutomaginariumCore.tableAleatoire(config, 17);
  const symmetric = AutomaginariumCore.tableSymetrique(config, 17);
  const totalistic = AutomaginariumCore.tableTotalistique(config);

  assert.equal(Object.keys(random).length, 8);
  assert.deepEqual(symmetric["[0,1,1]"], symmetric["[1,1,0]"]);
  assert.deepEqual(totalistic["[1,1,0]"], [2, 0]);
}

function testGeneticHelpersAndPerturbation() {
  const baseConfig = {
    nom: "Base",
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
    mode_regle: "table",
    table_transition: AutomaginariumCore.tableWolfram(90),
    largeur: 7,
    hauteur: 5,
    etat_initial: { mode: "centre" },
  };
  const population = AutomaginariumCore.populationInitiale(baseConfig, 6, 19);
  assert.equal(population.length, 6);
  const evaluated = AutomaginariumCore.evaluerPopulation(population, AutomaginariumCore.presetPoidsGenetique("beau"));
  assert.equal(evaluated.length, 6);
  assert.equal(evaluated[0].metriques.scores_par_canal.length, 2);
  const nextPopulation = AutomaginariumCore.nouvelleGeneration(
    population,
    evaluated.map((entry) => entry.score),
    50,
    23,
  );
  assert.equal(nextPopulation.length, 6);

  const universe = AutomaginariumCore.genererUnivers(baseConfig);
  const perturbed = AutomaginariumCore.appliquerPerturbation(universe, {
    cx: 3,
    cy: 2,
    rayon: 1,
    force: 1,
    type: "effacer",
    graine: 7,
  });
  assert.equal(perturbed.lignes[2][3], 0);
}

function testSummariesAndHudMetrics() {
  const config = {
    nom: "Resume",
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
    table_transition: {
      "[0,0,0]": [0],
      "[0,0,1]": [1],
    },
    largeur: 5,
    hauteur: 4,
    etat_initial: { mode: "centre" },
  };
  const summary = AutomaginariumCore.summarizeConfig(config);
  const transition = AutomaginariumCore.summarizeTransition(config);
  assert(summary.includes("5 x 4 cellules"));
  assert(transition.includes("2 transition(s) actives"));

  const universe = AutomaginariumCore.genererUnivers({
    ...config,
    alphabet_sortie: [0, 1],
    table_transition: AutomaginariumCore.tableWolfram(90),
  });
  const metrics = AutomaginariumCore.universeHudMetrics(universe);
  assert.equal(metrics.generations, 4);
  assert.equal(typeof metrics.density, "number");
  assert.equal(typeof metrics.entropy, "number");

  const randomRule = AutomaginariumCore.randomRuleNumber(1024n, 11);
  assert(randomRule >= 0n);
  assert(randomRule < 1024n);
}

function testFormAndDescriptionHelpers() {
  const config = AutomaginariumCore.formStateToConfig({
    name: "Forme",
    alphabetInput: "0,1,2",
    alphabetOutput: "0,1,2",
    neighborhood: "4",
    channels: "2",
    width: "21",
    height: "12",
    boundary: "circulaire",
    initialMode: "motif",
    initialValues: "1,2,1",
    initialProbability: "0.33",
    cellSize: "6",
    ruleMode: "table",
    ruleNumber: "17",
  }, {});
  assert.equal(config.taille_voisinage, 5);
  assert.deepEqual(config.etat_initial.valeurs, [1, 2, 1]);
  const formState = AutomaginariumCore.configToFormState(config);
  assert.equal(formState.alphabetInput, "0,1,2");
  assert.equal(formState.cellSize, "6");

  const emptyRenderable = AutomaginariumCore.ensureRenderableConfiguration({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
  });
  assert(Object.keys(emptyRenderable.table_transition).length > 0);

  const built = AutomaginariumCore.buildGeneratedRuleConfig({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
  }, "wolfram", 90);
  assert.equal(built.effectiveGenerator, "wolfram");
  assert.deepEqual(built.config.table_transition["[1,1,0]"], [1]);

  const fallbackBuilt = AutomaginariumCore.buildGeneratedRuleConfig({
    alphabet_entree: [0, 1, 2],
    alphabet_sortie: [0, 1, 2],
    taille_voisinage: 5,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
  }, "wolfram", 90);
  assert.equal(fallbackBuilt.effectiveGenerator, "random");

  assert.equal(AutomaginariumCore.hudRuleLabel({
    neighborhood: "5",
    channels: "2",
    ruleMode: "numerique",
    wolframRule: "90",
  }), "R5x2");

  const description = AutomaginariumCore.describeConfiguration({
    nom: "Desc",
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
    table_transition: { "[0,0,0]": [0] },
  });
  assert.equal(description.title, "Desc");
  assert(description.ruleTableHtml.includes("[0,0,0]"));
  const signals = AutomaginariumCore.transitionSignalEntries({
    mode_regle: "table",
    table_transition: { "[0,0,0]": [0], "[0,0,1]": [1] },
  });
  assert.equal(signals[0].label, "Transition 1");
  assert(AutomaginariumCore.ruleSpaceLabel({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
  }).includes("regles possibles"));
}

testCanonicalKeys();
testWolfram90();
testBackwardCompatibility();
testMultiChannel();
testExamplesValidate();
testCanonicalRuleGenerators();
testGeneticHelpersAndPerturbation();
testSummariesAndHudMetrics();
testFormAndDescriptionHelpers();
console.log("core smoke ok");
