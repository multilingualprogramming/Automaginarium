import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAutomaginariumPacked } from "../public/generated/automate_packed_runtime.mjs";

const bytes = await readFile(new URL("../public/generated/automate_packed/module.wasm", import.meta.url));
const packed = await loadAutomaginariumPacked({ bytes });

assert.equal(Math.trunc(packed.cle_binaire_3(1, 0, 1)), 5);
assert.equal(Math.trunc(packed.sortie_wolfram(90, 6)), 1);
assert.equal(Math.trunc(packed.cellule_wolfram(90, 1, 1, 0)), 1);
assert.equal(Math.trunc(packed.sortie_totalistique(5, 3, 1)), 0);
assert.equal(Math.trunc(packed.code_voisinage_3_base(2, 1, 0, 3)), 21);
assert.equal(Math.trunc(packed.code_voisinage_5_base(1, 0, 1, 1, 0, 2)), 22);
assert.equal(Math.trunc(packed.cellule_totalistique_5(1, 0, 1, 1, 0, 2)), 1);
assert.equal(Math.trunc(packed.validation_mode_regle(2)), 1);
assert.equal(Math.trunc(packed.validation_mode_regle(9)), 0);

console.log("packed runtime smoke ok");
