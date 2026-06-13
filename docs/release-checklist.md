# Release Checklist

Before publishing a release:

1. Rebuild generated artifacts.

   ```powershell
   .\scripts\build-packed-runtime.ps1
   ```

   `requirements-build.txt` currently installs `multilingualprogramming[wasm]`
   from the multilingual `main` branch because the published PyPI 0.8.0 wheel
   does not include `build-browser-module`. After the next multilingual release,
   repin this to the released version and rerun this checklist.

2. Run all local tests.

   ```powershell
   python tests\french_core_smoke.py
   node tests\core_smoke.js
   node tests\generated_browser_module_smoke.js
   node tests\generated_parity_smoke.mjs
   node tests\browser_generated_flow_smoke.mjs
   node tests\packed_runtime_smoke.mjs
   node tests\static_site_smoke.js
   ```

3. Serve the repository root.

   ```powershell
   python -m http.server 8788
   ```

4. Open `http://localhost:8788/`.

5. Browser-check:

   - gallery thumbnails render
   - all presets load
   - Wolfram/random/symmetric/totalistic generation works
   - JSON import/export works
   - Exporter panel semantic-core JSON/source works with the generated module loaded
   - Replay controls in the Exporter panel step and play the current universe
   - PNG export works
   - browser console has no failed dynamic import, missing `module.wasm`, or preset JSON errors

6. Push to GitHub and verify Actions.

7. Confirm GitHub Pages serves:

   - root URL
   - `public/generated/automate_packed/module.wasm`
   - `public/generated/automate_universel/browser_module.mjs`
   - `examples/*.json`

8. Confirm generated files are not staged:

   ```powershell
   git status --short --ignored
   ```

   `public/generated/automate_packed/`, `public/generated/automate_universel.py`, and `public/generated/automate_universel/` should remain ignored locally.
