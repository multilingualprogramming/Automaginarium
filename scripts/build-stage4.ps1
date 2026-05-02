$ErrorActionPreference = "Stop"

$generatedDir = "public\generated"
New-Item -ItemType Directory -Force $generatedDir | Out-Null

$compiled = multilingual compile src\automate_universel.ml
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$compiled | Out-File -Encoding utf8 public\generated\automate_universel.py

multilingual build-wasm-bundle src\automate_packed_wasm.ml --out-dir public\generated\automate_packed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python scripts\ensure_wasm_bundle.py public\generated\automate_packed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Stage 4 generated artifacts refreshed."
