const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function testPagesEntrypoints() {
  const rootIndex = read("index.html");
  const publicIndex = read("public/index.html");
  assert(rootIndex.includes("public/index.html"));
  assert(publicIndex.includes("id=\"preset-gallery\""));
  assert(publicIndex.includes("type=\"module\" src=\"app.mjs\""));
  assert(fs.existsSync(path.join(root, ".nojekyll")));
}

function testPresetFiles() {
  const app = read("public/app.mjs");
  const presetIds = [...app.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
  assert(presetIds.length >= 8);
  for (const id of presetIds) {
    const file = path.join(root, "examples", `${id}.json`);
    assert(fs.existsSync(file), `missing example ${id}.json`);
    const config = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(typeof config.nom, "string");
    assert(Array.isArray(config.alphabet_entree));
    assert(Array.isArray(config.alphabet_sortie));
  }
}

function testDeployableGeneratedAssets() {
  const required = [
    "public/generated/automate_packed/module.wasm",
    "public/generated/automate_packed/host_shim.mjs",
    "public/generated/automate_packed_runtime.mjs",
    "public/generated/automate_packed/abi_manifest.json",
  ];
  for (const relative of required) {
    assert(fs.existsSync(path.join(root, relative)), `${relative} missing`);
  }
}

testPagesEntrypoints();
testPresetFiles();
testDeployableGeneratedAssets();
console.log("stage5 static ok");
