# Automaginarium

Automaginarium is a configurable universe generator for cellular automata. It extends the spirit of [Cellcosmos](https://github.com/multilingualprogramming/cellcosmos): instead of exploring only the 256 elementary Wolfram rules, it opens the rule space itself.

The project is designed to demonstrate the expressive power of the Multilingual programming language. The canonical automata concepts are written in French Multilingual source, while JavaScript is kept as a thin browser layer for loading JSON configurations, drawing to canvas, and wiring only the essential interface events.

## Vision

Cellcosmos showed how much visual and musical complexity can emerge from binary, one-dimensional, three-neighbor cellular automata. Automaginarium keeps that visual curiosity and generalizes the laboratory:

- configurable input alphabets: binary, ternary, quaternary, or custom values
- configurable neighborhood sizes: 3, 5, 7, and beyond
- one or more output channels per transition
- declarative rule tables, random rules, symmetric rules, and totalistic rules
- presets for elementary Wolfram rules and broader imaginative rule spaces
- visual exploration of generated universes

Automaginarium is not only a cellular automata viewer. It is a configurable universe generator.

## Repository Structure

```text
src/        French Multilingual canonical automata logic
public/     Static browser demo: minimal JS glue, canvas renderer, styles
examples/   Declarative automata configurations and presets
docs/       Migration notes, architecture, tutorials
scripts/    Future build helpers for Multilingual/WASM compilation
```

## Current Shape

The repository currently includes:

- a canonical French Multilingual core in `src/automate_universel.ml`
- a small JavaScript adapter in `public/automate-core.js` that mirrors the current core until the Multilingual/WASM build pipeline is wired
- a canvas UI in `public/app.mjs`
- a small progressive-enhancement layer in `public/ui.mjs`
- copied Cellcosmos heritage references in `public/metrics.js` and `src/cellcosmos_primitives_heritage.ml`
- example configurations and a JSON schema in `examples/`
- migration and architecture documentation in `docs/`
- canonical rule keys using JSON-array strings such as `"[0,1,0]"`

## Run The Demo

Serve the repository root with any static HTTP server, then open `/public/index.html`.

```bash
python -m http.server 8788
```

Then visit `http://localhost:8788/public/index.html`.

The demo can load bundled presets, edit alphabets/neighborhoods/channels/boundaries/initial states, generate rule tables, validate and apply JSON, import/export configurations, and export the current canvas as PNG.

The repository root also contains `index.html`, so the app can be served from the root URL. This is the recommended shape for GitHub Pages:

```text
https://<owner>.github.io/Automaginarium/
```

See `docs/github-pages.md` for deployment notes.

Useful docs:

- `docs/quickstart.md`
- `docs/create-universe.md`
- `docs/gallery.md`
- `docs/packed-runtime.md`
- `docs/release-checklist.md`

The repository also includes GitHub Actions workflows:

- `.github/workflows/deploy.yml` compiles the French Multilingual sources, validates the browser/WASM runtime, prepares a static Pages artifact, and deploys on pushes to `main`.
- `.github/workflows/monitor-multilingual.yml` runs scheduled compatibility checks against pinned, latest, and upstream `multilingualprogramming` builds.

Generated Multilingual/WASM outputs under `public/generated/automate_packed/` are intentionally ignored. GitHub Actions regenerates them before publishing Pages.

Smoke tests include:

```bash
node tests/core_smoke.js
multilingual compile src/automate_universel.ml
```

The packed runtime bridge is refreshed with:

```powershell
.\scripts\build-packed-runtime.ps1
node tests/packed_runtime_smoke.mjs
```

Static deployment checks run with:

```bash
node tests/static_site_smoke.js
```

The generated Python produced from the French core is checked with:

```bash
python tests/french_core_smoke.py
```

## Attribution

Automaginarium is a successor to Cellcosmos and intentionally reuses its project ideas and visual direction. The initial browser metrics and rendering approach are derived from Cellcosmos concepts:

- static canvas-based exploration
- gradient/palette-driven rendering
- French Multilingual source as the domain layer
- Wolfram elementary presets as a starting rule space

Where source code is directly adapted, comments identify Cellcosmos as the origin.

## Next Migration Steps

1. Compile more of `src/automate_universel.ml` through the Multilingual toolchain to WebAssembly or generated JavaScript.
2. Replace more of `public/automate-core.js` with generated calls into the French core.
3. Keep trimming browser-side helpers that do not strengthen the multilingual model.
4. Add more generated rule spaces: totalistic, symmetric, genetic, stochastic, and multi-channel examples.
