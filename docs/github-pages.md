# GitHub Pages Deployment

Automaginarium is a static site and can be served from GitHub Pages without an application server.

Recommended repository settings:

1. Open repository settings on GitHub.
2. Go to **Pages**.
3. Set **Source** to `GitHub Actions`.
5. Save.

The root `index.html` redirects to `public/index.html`, where the application runs. The workflow builds generated Multilingual/WASM artifacts at deploy time and uploads a complete Pages artifact.

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
.\scripts\build-stage4.ps1
python tests\stage6_french_core.py
node tests\stage3-smoke.js
node tests\stage4-wasm.mjs
node tests\stage5-static.js
```

Then serve locally from the repository root:

```powershell
python -m http.server 8788
```

Open:

```text
http://localhost:8788/
```
