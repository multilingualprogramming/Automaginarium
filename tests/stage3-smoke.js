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

testCanonicalKeys();
testWolfram90();
testBackwardCompatibility();
testMultiChannel();
testExamplesValidate();
console.log("stage3 smoke ok");
