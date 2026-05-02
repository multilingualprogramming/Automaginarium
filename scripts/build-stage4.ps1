$ErrorActionPreference = "Stop"

multilingual compile src\automate_universel.ml | Out-File -Encoding utf8 public\generated\automate_universel.py
multilingual build-wasm-bundle src\automate_packed_wasm.ml --out-dir public\generated\automate_packed --wasm-target browser
Copy-Item -Force public\generated\automate_packed\host_shim.js public\generated\automate_packed\host_shim.mjs

Write-Host "Stage 4 generated artifacts refreshed."
