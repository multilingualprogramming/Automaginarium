function createImportValue(entry, memoryRef, outputCallback) {
  if (entry.kind === "function") {
    return () => 0;
  }
  if (entry.kind === "memory") {
    const memory = new WebAssembly.Memory({ initial: 16 });
    memoryRef.current = memory;
    return memory;
  }
  if (entry.kind === "table") {
    return new WebAssembly.Table({ initial: 0, element: "anyfunc" });
  }
  if (entry.kind === "global") {
    return new WebAssembly.Global({ value: "i32", mutable: true }, 0);
  }
  outputCallback(`Unsupported WASM import kind: ${entry.kind}`);
  return undefined;
}

function createImportObject(module, memoryRef, outputCallback) {
  const imports = {};
  for (const entry of WebAssembly.Module.imports(module)) {
    if (!imports[entry.module]) {
      imports[entry.module] = {};
    }
    imports[entry.module][entry.name] = createImportValue(entry, memoryRef, outputCallback);
  }
  return imports;
}

export async function loadAutomaginariumPacked(options = {}) {
  const wasmUrl = options.wasmUrl || new URL("./automate_packed/module.wasm", import.meta.url);
  const memoryRef = { current: null };
  const outputCallback = options.outputCallback || (() => {});

  let module;
  if (options.bytes) {
    module = await WebAssembly.compile(options.bytes);
  } else {
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    module = await WebAssembly.compile(bytes);
  }

  const imports = createImportObject(module, memoryRef, outputCallback);
  const instance = await WebAssembly.instantiate(module, imports);
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
