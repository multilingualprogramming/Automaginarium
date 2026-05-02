const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
require("../public/automate-core.js");

function loadExample(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", name), "utf8"));
}

function testInitialSortiesAllChannels() {
  const universe = AutomaginariumCore.genererUnivers({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2, 3],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
    mode_regle: "table",
    table_transition: {
      "[0,0,0]": [0, 0], "[0,0,1]": [1, 2], "[0,1,0]": [2, 1], "[0,1,1]": [3, 3],
      "[1,0,0]": [1, 2], "[1,0,1]": [2, 3], "[1,1,0]": [3, 0], "[1,1,1]": [0, 1]
    },
    largeur: 5,
    hauteur: 2,
    etat_initial: { mode: "centre" }
  });

  const center = 2;
  // After fix: all channels should equal the cell value
  assert.deepEqual(universe.sorties[0][center], [1, 1], "center cell should have both channels = 1");
  assert.deepEqual(universe.sorties[0][0], [0, 0], "non-center cell should have both channels = 0");
  assert.deepEqual(universe.sorties[0][4], [0, 0], "edge cell should have both channels = 0");
}

function testInitialSortiesStringAlphabet() {
  const universe = AutomaginariumCore.genererUnivers({
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
      "[\"graine\",\"graine\",\"graine\"]": ["sol", "fleur"]
    },
    largeur: 7,
    hauteur: 2,
    etat_initial: { mode: "motif", valeurs: ["graine", "sol", "graine"] }
  });

  // Pattern is centered at (7-3)/2 = 2
  assert.equal(universe.lignes[0][2], "graine", "pattern center should be graine");
  assert.deepEqual(universe.sorties[0][2], ["graine", "graine"], "sorties should match cell value");
  assert.equal(universe.sorties[0][2][0], universe.lignes[0][2], "channel 0 should equal cell value");
  assert.equal(universe.sorties[0][2][1], universe.lignes[0][2], "channel 1 should equal cell value");
}

function testInitialSortiesSingleChannel() {
  // Single-channel config should not change (backward compatibility)
  const universe = AutomaginariumCore.genererUnivers({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
    table_transition: { "[0,0,0]": [0], "[0,0,1]": [1], "[0,1,0]": [1], "[0,1,1]": [0], "[1,0,0]": [1], "[1,0,1]": [0], "[1,1,0]": [0], "[1,1,1]": [1] },
    largeur: 5,
    hauteur: 2,
    etat_initial: { mode: "centre" }
  });

  assert.deepEqual(universe.sorties[0][2], [1], "center cell sorties should be [1]");
  assert.equal(universe.sorties[0][2][0], 1, "single channel should equal cell value");
}

function colorFor(value, config, channels) {
  const visualValue = channels && channels.length > 1 ? channels[1] : value;
  const alphabet = config.alphabet_sortie || config.alphabet_entree || [0, 1];
  let index = alphabet.findIndex((item) => String(item) === String(visualValue));
  if (index < 0) index = Math.abs(Number(visualValue) || Number(value) || 0) % alphabet.length;
  const palette = config.rendu?.palette || Array.from({ length: alphabet.length }, (_, i) => `#c${i}`);
  return palette[index % palette.length] || palette[0];
}

function testColorForSingleChannel() {
  const config = {
    alphabet_sortie: [0, 1],
    rendu: { palette: ["#bg", "#live"] }
  };

  assert.equal(colorFor(0, config, [0]), "#bg");
  assert.equal(colorFor(1, config, [1]), "#live");
}

function testColorForMultiChannel() {
  const config = {
    alphabet_sortie: [0, 1, 2, 3],
    rendu: { palette: ["#bg", "#red", "#green", "#blue"] }
  };

  // Single-element array → use value
  assert.equal(colorFor(2, config, [2]), "#green");
  // Multi-element array → use channel 1 (visual)
  assert.equal(colorFor(0, config, [0, 3]), "#blue", "should use channel 1 for color");
  assert.equal(colorFor(1, config, [2, 1]), "#red", "should use channel 1 even if channel 0 differs");
}

function testColorForStringAlphabet() {
  const config = {
    alphabet_sortie: ["sol", "graine", "tige", "fleur"],
    rendu: { palette: ["#bg", "#green", "#blue", "#orange"] }
  };

  assert.equal(colorFor("sol", config, ["sol"]), "#bg");
  assert.equal(colorFor("graine", config, ["graine"]), "#green");
  // Multi-channel string alphabet
  assert.equal(colorFor("sol", config, ["sol", "fleur"]), "#orange");
  assert.equal(colorFor("graine", config, ["graine", "tige"]), "#blue");
}

function shouldSkipCell(value, config, channels) {
  const visualValue = channels && channels.length > 1 ? channels[1] : value;
  const bgValue = config.alphabet_sortie?.[0] ?? config.alphabet_entree[0];
  return !config.rendu?.afficher_zero && String(visualValue) === String(bgValue);
}

function testSkipConditionSingleChannel() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    rendu: { afficher_zero: false }
  };

  assert.equal(shouldSkipCell(0, config, [0]), true, "skip background state");
  assert.equal(shouldSkipCell(1, config, [1]), false, "don't skip live state");
}

function testSkipConditionMultiChannel() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2, 3],
    rendu: { afficher_zero: false }
  };

  // Channel 0 = background, channel 1 = live → should NOT skip (visual is live)
  assert.equal(shouldSkipCell(0, config, [0, 3]), false, "should not skip when visual is non-bg");
  // Channel 0 = live, channel 1 = background → SHOULD skip (visual is background)
  assert.equal(shouldSkipCell(2, config, [2, 0]), true, "should skip when visual is background");
  // Both background → should skip
  assert.equal(shouldSkipCell(0, config, [0, 0]), true, "should skip when both channels are background");
  // Both live → should not skip
  assert.equal(shouldSkipCell(2, config, [2, 3]), false, "should not skip when visual is non-bg");
}

function testSkipConditionWithAfficherZero() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2, 3],
    rendu: { afficher_zero: true }
  };

  // With afficher_zero=true, nothing should be skipped
  assert.equal(shouldSkipCell(0, config, [0, 0]), false, "never skip when afficher_zero is true");
  assert.equal(shouldSkipCell(0, config, [0, 3]), false, "never skip when afficher_zero is true");
}

function testSkipConditionStringAlphabet() {
  const config = {
    alphabet_entree: ["sol", "graine"],
    alphabet_sortie: ["sol", "graine", "tige", "fleur"],
    rendu: { afficher_zero: false }
  };

  assert.equal(shouldSkipCell("sol", config, ["sol", "fleur"]), false, "don't skip sol when visual is fleur");
  assert.equal(shouldSkipCell("graine", config, ["graine", "sol"]), true, "skip when visual is sol (background)");
  assert.equal(shouldSkipCell("graine", config, ["graine", "tige"]), false, "don't skip when visual is tige");
}

function testExamplesInitialSorties() {
  // Verify that all examples produce correct initial sorties after the fix
  for (const file of fs.readdirSync(path.join(__dirname, "..", "examples"))) {
    if (!file.endsWith(".json") || file === "schema.json") continue;
    const config = loadExample(file);
    const universe = AutomaginariumCore.genererUnivers(config);

    // Check initial sorties shape: [row][cell][channel]
    assert.equal(universe.sorties.length, config.hauteur, `${file}: sorties row count`);
    assert.equal(universe.sorties[0].length, config.largeur, `${file}: sorties[0] cell count`);

    // For all cells in row 0, each channel should equal the cell value
    for (let x = 0; x < config.largeur; x += 1) {
      const cellValue = universe.lignes[0][x];
      const sortiesCell = universe.sorties[0][x];

      assert(Array.isArray(sortiesCell), `${file}: sorties[0][${x}] is array`);
      assert.equal(sortiesCell.length, config.nombre_canaux_sortie, `${file}: sorties[0][${x}] has correct channel count`);

      // After the fix, all channels should equal the cell value
      for (let ch = 0; ch < config.nombre_canaux_sortie; ch += 1) {
        assert.equal(String(sortiesCell[ch]), String(cellValue), `${file}: sorties[0][${x}][${ch}] equals lignes[0][${x}]`);
      }
    }
  }
}

function testMultiChannelRenderingEdgeCases() {
  // Test a complex multi-channel scenario where all combinations matter
  const universe = AutomaginariumCore.genererUnivers({
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1, 2, 3],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
    mode_regle: "table",
    table_transition: {
      "[0,0,0]": [0, 0], "[0,0,1]": [0, 3], "[0,1,0]": [0, 2], "[0,1,1]": [0, 1],
      "[1,0,0]": [0, 3], "[1,0,1]": [0, 2], "[1,1,0]": [0, 1], "[1,1,1]": [0, 0]
    },
    largeur: 5,
    hauteur: 2,
    etat_initial: { mode: "centre" },
    rendu: { afficher_zero: false }
  });

  // Row 1: center cell gets [0,1] (state=0=bg, visual=1)
  const centerCell = 2;
  assert.equal(universe.sorties[1][centerCell][0], 0, "channel 0 is background state");
  assert.notEqual(universe.sorties[1][centerCell][1], 0, "channel 1 (visual) is non-background");
  // This cell should NOT be skipped because the visual is non-background
  assert.equal(shouldSkipCell(universe.lignes[1][centerCell], universe.configuration, universe.sorties[1][centerCell]), false);
}

testInitialSortiesAllChannels();
testInitialSortiesStringAlphabet();
testInitialSortiesSingleChannel();
testColorForSingleChannel();
testColorForMultiChannel();
testColorForStringAlphabet();
testSkipConditionSingleChannel();
testSkipConditionMultiChannel();
testSkipConditionWithAfficherZero();
testSkipConditionStringAlphabet();
testExamplesInitialSorties();
testMultiChannelRenderingEdgeCases();

function testRuleConfigurationBinary3() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
  };
  const rc = AutomaginariumCore.ruleConfiguration(config);
  assert.equal(rc.s, 2, "input alphabet size");
  assert.equal(rc.k, 3, "neighborhood size");
  assert.equal(rc.t, 2, "output alphabet size");
  assert.equal(rc.m, 1, "output channels");
  assert.equal(rc.base, 2, "base = 2^1");
  assert.equal(rc.digits, 8, "digits = 2^3");
  assert.equal(rc.maxRule, 256n, "max rule = 2^8");
}

function testRuleConfigurationBinary3Binary2Channel() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
  };
  const rc = AutomaginariumCore.ruleConfiguration(config);
  assert.equal(rc.base, 4, "base = 2^2");
  assert.equal(rc.digits, 8, "digits = 2^3");
  // 4^8 = 65536, maxRule is the count of possible rules
  assert.equal(rc.maxRule, 65536n, "max rule count = 4^8");
}

function testRuleConfigurationQuaternary3() {
  const config = {
    alphabet_entree: [0, 1, 2, 3],
    alphabet_sortie: [0, 1, 2, 3],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
  };
  const rc = AutomaginariumCore.ruleConfiguration(config);
  assert.equal(rc.s, 4, "input alphabet size");
  assert.equal(rc.base, 4, "base = 4^1");
  assert.equal(rc.digits, 64, "digits = 4^3");
}

function testNeighborhoodToRuleIndex() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
  };
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([0, 0, 0], 2), 0);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([0, 0, 1], 2), 1);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([0, 1, 0], 2), 2);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([0, 1, 1], 2), 3);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([1, 0, 0], 2), 4);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([1, 0, 1], 2), 5);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([1, 1, 0], 2), 6);
  assert.equal(AutomaginariumCore.codeVoisinageNumerique([1, 1, 1], 2), 7);
}

function testWolfram30GetOutput() {
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
  };
  // Rule 30: compute outputs on-the-fly without generating full table
  // Rule 30 = 00011110 in binary
  // Index 0 ([0,0,0]): bit 0 = 0
  // Index 1 ([0,0,1]): bit 1 = 1
  // Index 2 ([0,1,0]): bit 2 = 1
  // etc.
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [0, 0, 0], config), [0]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [0, 0, 1], config), [1]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [0, 1, 0], config), [1]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [0, 1, 1], config), [1]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [1, 0, 0], config), [1]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [1, 0, 1], config), [0]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [1, 1, 0], config), [0]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(30n, [1, 1, 1], config), [0]);
}

function testRuleOutputLargeSpace() {
  // Ternary 3-neighborhood: 3^(1·3^3) = 3^27 ≈ 7.6 trillion rules
  // Never materializes the full table, just computes on-the-fly
  const config = {
    alphabet_entree: [0, 1, 2],
    alphabet_sortie: [0, 1, 2],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
  };
  const ruleNumber = 12345n; // arbitrary rule in huge space
  const voisinage = [1, 0, 2];
  const output = AutomaginariumCore.getRuleOutput(ruleNumber, voisinage, config);
  assert(Array.isArray(output), "getRuleOutput returns array");
  assert.equal(output.length, 1, "output has correct channel count");
  assert(config.alphabet_sortie.includes(output[0]), "output is valid symbol");
}

function testMultiChannelGetOutput() {
  // Binary 3-neighborhood with 2 output channels
  // Rule space size: 2^(2·2^3) = 2^16 = 65,536 rules
  const config = {
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 2,
  };
  // Rule 0 should output [0,0] for all inputs
  assert.deepEqual(AutomaginariumCore.getRuleOutput(0n, [0, 0, 0], config), [0, 0]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(0n, [1, 1, 1], config), [0, 0]);

  // Rule 1 in base-4 is: digit 0 at position 0 = 1 = [0,1]
  // All other positions = 0 = [0,0]
  assert.deepEqual(AutomaginariumCore.getRuleOutput(1n, [0, 0, 0], config), [0, 1]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(1n, [0, 0, 1], config), [0, 0]);
  assert.deepEqual(AutomaginariumCore.getRuleOutput(1n, [1, 1, 1], config), [0, 0]);
}

testRuleConfigurationBinary3();
testRuleConfigurationBinary3Binary2Channel();
testRuleConfigurationQuaternary3();
testNeighborhoodToRuleIndex();
testWolfram30GetOutput();
testRuleOutputLargeSpace();
testMultiChannelGetOutput();

console.log("stage7 canvas smoke ok");
