# Architecture

Automaginarium is split into four layers:

```text
examples/*.json              declarative universes
src/automate_universel.ml    canonical French Multilingual automata core
public/automate-core.js      temporary browser adapter mirroring the core
public/app.mjs               DOM events, canvas drawing, preset loading
public/ui.mjs                small progressive-enhancement UI bridge
```

The intended stable boundary is the configuration object. The UI should not know Wolfram-specific details except where it offers a preset shortcut.

Canonical JSON-array rule keys use forms such as `"[0,1,0]"`, rather than concatenated keys such as `"010"`. The browser adapter still accepts older Cellcosmos-style keys as a compatibility fallback.

The packed Multilingual/WASM bridge keeps the full French core as the canonical configuration and evolution model, while `src/automate_packed_wasm.ml` exposes a narrow numeric ABI for browser calls. The browser prefers `window.AutomaginariumPacked` when available and falls back to JavaScript only where rich JSON orchestration is still needed.

## Reuse From Cellcosmos

Directly reusable ideas:

- canvas grid rendering
- PNG export
- palette-driven visual exploration
- Wolfram rule table generation
- metrics formulas from `public/metrics.js`
- French Multilingual domain source organization from `src/automate_elementaire_wasm.ml`

The first skeleton intentionally avoids copying the full Cellcosmos interface because the old UI is tightly coupled to elementary binary rules. Features should be migrated as isolated modules.
