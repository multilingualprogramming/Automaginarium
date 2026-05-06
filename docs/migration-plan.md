# Migration Plan From Cellcosmos

## Stage 1 - Skeleton

- create `src/`, `public/`, `examples/`, `docs/`, and `scripts/`
- add French Multilingual core concepts for arbitrary alphabets and neighborhoods
- add declarative presets
- add a small static browser demo
- document attribution and reuse points

## Stage 2 - Configuration Model

- add JSON schema validation
- add generated transition tables for symmetric and totalistic rules
- add explicit multi-channel rendering modes
- add import/export of configuration JSON

## Stage 3 - French Multilingual Engine

- compile `src/automate_universel.multi` with the Multilingual toolchain
- expose `generer_univers`, `prochaine_generation`, and rule generators to WASM/generated bindings
- remove duplicated transition logic from JavaScript

## Stage 4 - Minimal JavaScript

- keep `public/app.mjs` focused on DOM, canvas, fetch, and events
- keep rule logic behind `window.AutomaginariumCore` or WASM exports
- migrate Cellcosmos share URLs and gallery generation only after the core boundary is stable

## Stage 5 - Presets

- Wolfram elementary rules: 0-255 table generation
- binary 3-neighborhood multi-output examples
- binary 5- and 7-neighborhood examples
- ternary and quaternary totalistic families
- imaginative named universes for emergence demos
