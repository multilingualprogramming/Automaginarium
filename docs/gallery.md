# Preset Gallery

Stage 5 adds a browser-rendered preset gallery. Each gallery tile is generated from the same Automaginarium configuration model used by the main canvas.

Current preset families:

- elementary Wolfram rules: 30, 90, 110
- binary neighborhood 5 totalistic exploration
- ternary totalistic exploration
- quaternary multi-channel totalistic exploration
- named-symbol table rules
- multi-channel color examples

The gallery intentionally uses real generated thumbnails rather than static images. This keeps presets honest: if an example configuration breaks, the gallery breaks visibly and the smoke tests catch the missing file.

The static check is:

```powershell
node tests\stage5-static.js
```
