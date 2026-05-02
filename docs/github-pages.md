# GitHub Pages Deployment

Automaginarium is a static site and can be served from GitHub Pages without an application server.

Recommended repository settings:

1. Open repository settings on GitHub.
2. Go to **Pages**.
3. Set **Source** to `Deploy from a branch`.
4. Select the main branch and `/ (root)`.
5. Save.

The root `index.html` redirects to `public/index.html`, where the application runs. This keeps the repository structure explicit while still making the GitHub Pages root URL usable.

Files that must be committed for Pages:

- `public/index.html`
- `public/app.mjs`
- `public/automate-core.js`
- `public/style.css`
- `public/generated/automate_packed/module.wasm`
- `public/generated/automate_packed/*.js`
- `public/generated/automate_packed/*.mjs`
- `examples/*.json`

The `.nojekyll` file disables Jekyll processing so GitHub Pages serves static generated assets as-is.

Before publishing, run:

```powershell
.\scripts\build-stage4.ps1
node tests\stage3-smoke.js
node tests\stage4-wasm.mjs
```

Then serve locally from the repository root:

```powershell
python -m http.server 8788
```

Open:

```text
http://localhost:8788/
```
