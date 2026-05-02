import * as hostShim from "./automate_packed/host_shim.mjs";

function createFallbackWasiImports(memoryRef = { current: null }, outputCallback = () => {}) {
  const textDecoder = new TextDecoder("utf-8");
  let stdoutBuffer = "";
  const writeOutput = () => {
    let newlineIndex;
    while ((newlineIndex = stdoutBuffer.indexOf("\n")) !== -1) {
      outputCallback(stdoutBuffer.slice(0, newlineIndex));
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
    }
  };

  return {
    wasi_snapshot_preview1: {
      fd_write(fd, iovsPtr, iovsLen, nwrittenPtr) {
        if (fd !== 1 && fd !== 2) return 8;
        const memory = memoryRef.current;
        if (!memory) return 8;
        const view = new DataView(memory.buffer);
        let written = 0;
        for (let index = 0; index < iovsLen; index += 1) {
          const ptr = view.getUint32(iovsPtr + index * 8, true);
          const len = view.getUint32(iovsPtr + index * 8 + 4, true);
          stdoutBuffer += textDecoder.decode(new Uint8Array(memory.buffer, ptr, len));
          written += len;
        }
        writeOutput();
        view.setUint32(nwrittenPtr, written, true);
        return 0;
      },
      fd_read(_fd, _iovsPtr, _iovsLen, nreadPtr) {
        const memory = memoryRef.current;
        if (memory) {
          new DataView(memory.buffer).setUint32(nreadPtr, 0, true);
        }
        return 0;
      },
      args_sizes_get(argcPtr, argvBufSizePtr) {
        const memory = memoryRef.current;
        if (!memory) return 8;
        const view = new DataView(memory.buffer);
        view.setUint32(argcPtr, 0, true);
        view.setUint32(argvBufSizePtr, 0, true);
        return 0;
      },
      args_get() {
        return 0;
      },
    },
    memoryRef,
  };
}

function createFallbackDomImports() {
  return { env: {} };
}

export async function loadAutomaginariumPacked(options = {}) {
  const wasmUrl = options.wasmUrl || new URL("./automate_packed/module.wasm", import.meta.url);
  const memoryRef = { current: null };
  const exportsRef = { current: null };
  const createWasiImports = hostShim.createWasiImports || createFallbackWasiImports;
  const createDomImports = hostShim.createDomImports || createFallbackDomImports;
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
