import importlib.util
import pathlib


ROOT = pathlib.Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "generated" / "automate_universel.py"


def load_core():
    assert GENERATED.exists(), f"generated French core missing: {GENERATED}"
    spec = importlib.util.spec_from_file_location("automate_universel_generated", GENERATED)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_wolfram_table(core):
    table = core.table_wolfram(90)
    assert table["[1,1,0]"] == [1]
    assert table["[0,1,0]"] == [0]
    assert table["[0,0,1]"] == [1]


def test_symmetric_table(core):
    config = {
        "alphabet_entree": [0, 1],
        "alphabet_sortie": [0, 1],
        "taille_voisinage": 3,
        "nombre_canaux_sortie": 1,
    }
    table = core.table_symetrique(config, 7)
    assert table["[0,1,1]"] == table["[1,1,0]"]


def test_detailed_universe(core):
    config = {
        "alphabet_entree": [0, 1, 2],
        "alphabet_sortie": [0, 1, 2],
        "taille_voisinage": 3,
        "nombre_canaux_sortie": 2,
        "mode_regle": "totalistique",
        "largeur": 9,
        "hauteur": 5,
        "etat_initial": {"mode": "centre"},
    }
    universe = core.generer_univers_detaille(config)
    assert len(universe["lignes"]) == 5
    assert len(universe["sorties"][1][4]) == 2


def test_validation(core):
    result = core.valider_configuration({
        "alphabet_entree": [0, 1],
        "alphabet_sortie": [0, 1],
        "taille_voisinage": 3,
        "nombre_canaux_sortie": 1,
        "mode_regle": "table",
        "table_transition": core.table_wolfram(30),
    })
    assert result["valide"] is True
    assert result["erreurs"] == []


def test_deterministic_random_helper(core):
    first = core.sortie_aleatoire_deterministe(123, 9, 4, 3)
    second = core.sortie_aleatoire_deterministe(123, 9, 4, 3)
    third = core.sortie_aleatoire_deterministe(123, 10, 4, 3)
    assert first == second
    assert first != third
    assert len(first) == 3
    assert all(0 <= value < 4 for value in first)


if __name__ == "__main__":
    core = load_core()
    test_wolfram_table(core)
    test_symmetric_table(core)
    test_detailed_universe(core)
    test_validation(core)
    test_deterministic_random_helper(core)
    print("french core smoke ok")
