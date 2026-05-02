// Auto-generated renderer skeleton from multilingual WASM ABI manifest
//
// Exported functions (all numeric args/returns are f64):
//   cle_binaire_3(arg0: f64, arg1: f64, arg2: f64) -> f64
//   sortie_wolfram(arg0: f64, arg1: f64) -> f64
//   cellule_wolfram(arg0: f64, arg1: f64, arg2: f64, arg3: f64) -> f64
//   sortie_totalistique(arg0: f64, arg1: f64, arg2: f64) -> f64
//   cellule_totalistique_3(arg0: f64, arg1: f64, arg2: f64, arg3: f64) -> f64
//   lire_bord_fixe(arg0: f64, arg1: f64) -> f64
//   taille_voisinage_normalisee(arg0: f64) -> f64
//   sortie_table_code(arg0: f64, arg1: f64) -> f64
//   validation_mode_regle(arg0: f64) -> f64
export const ABI_EXPORTS = {
  "cle_binaire_3": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "sortie_wolfram": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "cellule_wolfram": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "sortie_totalistique": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "cellule_totalistique_3": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "lire_bord_fixe": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "taille_voisinage_normalisee": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "sortie_table_code": {
    "mode": "scalar_field",
    "stream_output": null
  },
  "validation_mode_regle": {
    "mode": "scalar_field",
    "stream_output": null
  }
};

export async function loadWasmModule(url, importsFactory) {
  const memoryRef = { current: null };
  const imports = importsFactory(memoryRef);
  const result = await WebAssembly.instantiateStreaming(fetch(url), imports);
  const exports = result.instance.exports;
  memoryRef.current = exports.memory || null;
  return { instance: result.instance, exports, memoryRef };
}

// Load the canonical bundle emitted by `build-wasm-bundle` from a directory URL.
export async function loadWasmBundle(baseUrl, importsFactory) {
  const bundleUrl = new URL('module.wasm', new URL(baseUrl, import.meta.url));
  return loadWasmModule(bundleUrl, importsFactory);
}

// Call any exported numeric function by name.
// args: array of numbers (f64).  Returns the f64 result, or undefined for void.
// Example: callFunction(exports, 'fibonacci', [10]) // => 55
export function callFunction(exports, name, args = []) {
  const fn = exports[name];
  if (!fn) throw new Error(`No export named '${name}'`);
  return fn(...args);
}

export function renderByMode(ctx, abiName, exports, args = []) {
  const abi = ABI_EXPORTS[abiName];
  if (!abi) throw new Error(`Unknown ABI export: ${abiName}`);
  if (abi.mode === 'scalar_field') {
    return callFunction(exports, abiName, args);
  }
  if (abi.mode === 'point_stream' || abi.mode === 'polyline') {
    const stream = abi.stream_output;
    if (!stream) throw new Error(`Missing stream metadata for ${abiName}`);
    const count = exports[stream.count_export]();
    return { count, writer: stream.writer_export };
  }
  throw new Error(`Unsupported render mode: ${abi.mode}`);
}