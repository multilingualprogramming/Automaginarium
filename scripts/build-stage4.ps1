$ErrorActionPreference = "Stop"

python scripts\build_wasm_bundle.py
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Stage 4 generated artifacts refreshed."
