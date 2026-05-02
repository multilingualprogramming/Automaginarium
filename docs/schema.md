# Configuration Schema

The configuration is editable from the browser, and the canonical shape is also captured in `examples/schema.json`.

Important fields:

- `alphabet_entree`: symbols used when reading neighborhoods
- `alphabet_sortie`: symbols emitted by transition rules
- `taille_voisinage`: odd neighborhood size, such as 3, 5, or 7
- `nombre_canaux_sortie`: number of values returned by a transition
- `mode_regle`: `table`, `totalistique`, `aleatoire`, or `numerique`
- `table_transition`: declarative rule map from canonical JSON-array neighborhood keys to output channel values, for example `"[0,1,0]": [1]`
- `etat_initial`: `centre`, `motif`, or `aleatoire`
- `rendu`: visual hints consumed only by the browser layer

The first output channel becomes the next generation state. In the browser adapter, the second channel can influence color when present. The French Multilingual core remains the intended canonical implementation.
