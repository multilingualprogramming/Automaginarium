# GitHub Pages Deployment

Automaginarium is a static site and can be served from GitHub Pages without an application server.

Recommended repository settings:

1. Open repository settings on GitHub.
2. Go to **Pages**.
3. Set **Source** to `GitHub Actions`.
5. Save.

The workflow builds generated Multilingual/WASM artifacts at deploy time, then publishes the contents of `public/` as the GitHub Pages site root. The `examples/` and `docs/` directories are copied alongside it in the final Pages artifact.

Source files that must be committed for Pages:

- `public/index.html`
- `public/app.mjs`
- `public/automate-core.js`
- `public/style.css`
- `public/generated/automate_packed_runtime.mjs`
- `examples/*.json`
- `src/*.ml`
- `.github/workflows/deploy.yml`

Generated files that should not be committed:

- `public/generated/automate_packed/`
- `public/generated/automate_universel.py`

The `.nojekyll` file disables Jekyll processing so GitHub Pages serves static generated assets as-is.

Before publishing, run:

```powershell
.\scripts\build-packed-runtime.ps1
python tests\french_core_smoke.py
node tests\core_smoke.js
node tests\packed_runtime_smoke.mjs
node tests\static_site_smoke.js
```

Then serve locally from the repository root:

```powershell
python -m http.server 8788
```

Open:

```text
http://localhost:8788/public/index.html
```
