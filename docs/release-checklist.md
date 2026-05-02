# Release Checklist

Before publishing a release:

1. Rebuild generated artifacts.

   ```powershell
   .\scripts\build-packed-runtime.ps1
   ```

2. Run all local tests.

   ```powershell
   python tests\french_core_smoke.py
   node tests\core_smoke.js
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
   - PNG export works
   - browser console has no missing `module.wasm` or preset JSON errors

6. Push to GitHub and verify Actions.

7. Confirm GitHub Pages serves:

   - root URL
   - `public/generated/automate_packed/module.wasm`
   - `examples/*.json`

8. Confirm generated files are not staged:

   ```powershell
   git status --short --ignored
   ```

   `public/generated/automate_packed/` and `public/generated/automate_universel.py` should remain ignored locally.
