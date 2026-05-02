# Quickstart

Automaginarium runs as a static site.

```powershell
python -m http.server 8788
```

Open:

```text
http://localhost:8788/
```

From there:

1. Pick a preset from the gallery.
2. Change the alphabet, neighborhood size, or initial state.
3. Choose a rule generator.
4. Click **Generer** or **Appliquer**.
5. Export the result as PNG or JSON.

No application server is required. The generated Multilingual/WASM bundle is served from `public/generated/`.

## Rebuild Generated Artifacts

```powershell
.\scripts\build-packed-runtime.ps1
```

Then run:

```powershell
python tests\french_core_smoke.py
node tests\core_smoke.js
node tests\packed_runtime_smoke.mjs
node tests\static_site_smoke.js
```
