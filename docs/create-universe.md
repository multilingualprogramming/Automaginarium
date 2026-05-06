# Create A Universe

A universe is a JSON object. The most important fields are:

- `alphabet_entree`: values read from each neighborhood
- `alphabet_sortie`: values produced by the transition rule
- `taille_voisinage`: neighborhood width, usually 3, 5, or 7
- `nombre_canaux_sortie`: how many values each transition returns
- `mode_regle`: `table`, `totalistique`, or `aleatoire`
- `table_transition`: explicit rule table when using `table`
- `etat_initial`: seed pattern

Example:

```json
{
  "nom": "Mini univers",
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
  },
  "largeur": 101,
  "hauteur": 80,
  "etat_initial": { "mode": "centre" }
}
```

Rule keys are JSON arrays encoded as strings. This is deliberate: `"[\"a\",\"aa\"]"` is unambiguous, while a concatenated key such as `"aaa"` is not.

## Multi-Channel Output

The first output channel becomes the next state. Later channels can affect rendering. For example:

```json
"[0,1,0]": [1, 3]
```

Here `1` drives evolution and `3` can drive color.

## French Multilingual Ownership

The canonical model lives in `src/automate_universel.multi`. The browser-friendly numeric WASM bridge lives in `src/automate_packed_wasm.multi`. JavaScript should stay focused on JSON loading, UI events, and canvas rendering.
