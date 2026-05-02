# Configuration Guide

Minimal binary elementary rule:

```json
{
  "nom": "Automate binaire elementaire",
  "alphabet_entree": [0, 1],
  "alphabet_sortie": [0, 1],
  "taille_voisinage": 3,
  "nombre_canaux_sortie": 1,
  "mode_regle": "table",
  "table_transition": {
    "[1,1,1]": [0],
    "[1,1,0]": [1],
    "[1,0,1]": [1],
    "[1,0,0]": [0],
    "[0,1,1]": [1],
    "[0,1,0]": [1],
    "[0,0,1]": [1],
    "[0,0,0]": [0]
  }
}
```

Rule keys are canonical JSON arrays encoded as strings. This avoids collisions for custom alphabets such as `["a", "aa"]`. `nombre_canaux_sortie` allows a rule to return several values; the first channel drives evolution, while later channels can drive color or other media.
