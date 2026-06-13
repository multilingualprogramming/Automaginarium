# Architecture

Automaginarium is split into four layers:

```text
examples/*.json              declarative universes
src/automate_universel.multi    canonical French Multilingual automata core
public/automate-core.js      temporary browser adapter mirroring the core
public/app.mjs               essential DOM events, canvas drawing, preset loading
```

The intended stable boundary is the configuration object. The UI should not know Wolfram-specific details except where it offers a preset shortcut.

The browser layer is intentionally narrow: one module reads and writes form controls, delegates configuration assembly, evolution, canonical rule-table generation, genetic evaluation, and perturbation mutations to the core bridge, renders the resulting universe, and wires a static preset gallery. Presentation-only concerns such as tab systems, mirrored form state, and client-side gallery choreography are not part of the long-term architecture.

`scripts/build_wasm_bundle.py` now generates a browser-native rich module from the canonical French source:

```text
public/generated/automate_universel/browser_module.mjs
```

`public/app.mjs` loads that module into `window.AutomaginariumUniversVivant` before the UI starts. `public/automate-core.js` is therefore a generated-first compatibility bridge: it forwards rich JSON behavior to the generated `.multi` module when present, keeps JavaScript fallbacks for local/dev compatibility, and still calls the packed WASM numeric ABI for narrow scalar helpers.

The Exporter panel is also the first user-facing payoff for the living-universe manifest: it shows the generated semantic-core JSON/source and offers a Replay mini-canvas driven by the current universe timeline.

Advanced tools such as the genetic workbench and perturbation toolkit are now lazy browser features. They are loaded only when their panels are opened, so the baseline application path stays focused on the core Multilingual configuration and rendering loop.

Canonical JSON-array rule keys use forms such as `"[0,1,0]"`, rather than concatenated keys such as `"010"`. The browser adapter still accepts older Cellcosmos-style keys as a compatibility fallback.

The packed Multilingual/WASM bridge keeps the full French core as the canonical configuration and evolution model, while `src/automate_packed_wasm.multi` exposes a narrow numeric ABI for browser calls. The browser prefers `window.AutomaginariumPacked` for numeric primitives and `window.AutomaginariumUniversVivant` for rich configuration/universe behavior before falling back to JavaScript compatibility code.

Rule-table generation follows the same pattern: canonical helpers live in `src/automate_universel.multi`, narrow deterministic numeric helpers live in `src/automate_packed_wasm.multi`, and `public/automate-core.js` exposes the browser bridge so `public/app.mjs` does not duplicate the rule logic, form-to-config assembly, or configuration summaries.

## Reuse From Cellcosmos

Directly reusable ideas:

- canvas grid rendering
- PNG export
- palette-driven visual exploration
- Wolfram rule table generation
- metrics formulas from `public/metrics.js`
- French Multilingual domain source organization from `src/automate_elementaire_wasm.multi`

The first skeleton intentionally avoids copying the full Cellcosmos interface because the old UI is tightly coupled to elementary binary rules. Features should be migrated as isolated modules.
