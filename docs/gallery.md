# Preset Gallery

The preset gallery uses the same Automaginarium configuration model as the main canvas, but it is now authored directly in `public/index.html` and wired with a minimal click handler from `public/app.mjs`.

Current preset families:

- elementary Wolfram rules: 30, 90, 110
- binary neighborhood 5 totalistic exploration
- ternary totalistic exploration
- quaternary multi-channel totalistic exploration
- named-symbol table rules
- multi-channel color examples

The gallery intentionally stays lightweight:

- cards are static markup
- labels and short descriptions are part of the document
- clicks load the referenced JSON preset into the main laboratory

This preserves discoverability without requiring client-side thumbnail generation or a separate gallery state machine.

The static check is:

```powershell
node tests\static_site_smoke.js
```
