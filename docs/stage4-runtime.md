# Stage 4 Runtime Bridge

Stage 4 introduces a generated runtime path from French Multilingual into the browser.

The rich canonical engine remains:

```text
src/automate_universel.ml
```

The browser-friendly numeric ABI lives in:

```text
src/automate_packed_wasm.ml
```

Generated artifacts are written to:

```text
public/generated/automate_packed/
public/generated/automate_universel.py
```

The browser loads `public/generated/automate_packed_runtime.mjs`, which instantiates `module.wasm` and installs `window.AutomaginariumPacked`. `public/automate-core.js` then calls generated Multilingual/WASM exports for narrow numeric primitives such as Wolfram and totalistic outputs, while retaining JavaScript fallback behavior for rich JSON table orchestration.

Regenerate artifacts with:

```powershell
.\scripts\build-stage4.ps1
```

Current limitation: the full JSON/dictionary/list-rich core compiles to generated Python but does not yet produce a browser WASM bundle with the current Multilingual WAT backend. The narrow ABI module is the deliberate bridge until richer data lowering is available.
