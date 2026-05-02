import { createDomImports, createWasiImports } from "./automate_packed/host_shim.mjs";

export async function loadAutomaginariumPacked(options = {}) {
  const wasmUrl = options.wasmUrl || new URL("./automate_packed/module.wasm", import.meta.url);
  const memoryRef = { current: null };
  const exportsRef = { current: null };
  const imports = {
    ...createWasiImports(memoryRef, options.outputCallback || (() => {})),
    ...createDomImports(memoryRef, exportsRef),
  };

  let instance;
  if (options.bytes) {
    const result = await WebAssembly.instantiate(options.bytes, imports);
    instance = result.instance;
  } else if (typeof WebAssembly.instantiateStreaming === "function") {
    const result = await WebAssembly.instantiateStreaming(fetch(wasmUrl), imports);
    instance = result.instance;
  } else {
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, imports);
    instance = result.instance;
  }

  exportsRef.current = instance.exports;
  memoryRef.current = instance.exports.memory || memoryRef.current;
  return instance.exports;
}

export async function installAutomaginariumPacked(options = {}) {
  try {
    const exports = await loadAutomaginariumPacked(options);
    window.AutomaginariumPacked = exports;
    window.AutomaginariumCoreSource = "multilingual-wasm";
    return exports;
  } catch (error) {
    console.warn("Automaginarium: generated Multilingual/WASM core unavailable; using JavaScript fallback.", error);
    window.AutomaginariumPacked = null;
    window.AutomaginariumCoreSource = "javascript-fallback";
    return null;
  }
}
