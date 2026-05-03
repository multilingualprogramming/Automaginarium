import importlib.util
import pathlib
import sys
import types


ROOT = pathlib.Path(__file__).resolve().parents[1]
GENERATED = ROOT / "public" / "generated" / "automate_universel.py"
GENERATED_DIR = GENERATED.parent
GRADIENT_MODULE = "dégradés_couleur"


def load_core():
    assert GENERATED.exists(), f"generated French core missing: {GENERATED}"
    generated_dir = str(GENERATED_DIR)
    if generated_dir not in sys.path:
        sys.path.insert(0, generated_dir)
    if GRADIENT_MODULE not in sys.modules:
        # The generated core currently imports this helper even though the smoke
        # tested code paths do not use it.
        sys.modules[GRADIENT_MODULE] = types.ModuleType(GRADIENT_MODULE)
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


def test_form_and_summary_helpers(core):
    config = core.etat_formulaire_vers_configuration({
        "name": "Formulaire",
        "alphabetInput": "0,1,2",
        "alphabetOutput": "0,1,2",
        "neighborhood": "4",
        "channels": "2",
        "width": "31",
        "height": "12",
        "boundary": "circulaire",
        "initialMode": "motif",
        "initialValues": "1,2,1",
        "cellSize": "6",
        "ruleMode": "table",
        "ruleNumber": "17",
    })
    assert config["taille_voisinage"] == 5
    assert config["etat_initial"]["valeurs"] == [1, 2, 1]
    form_state = core.configuration_vers_etat_formulaire(config)
    assert form_state["alphabetInput"] == "0,1,2"
    assert form_state["cellSize"] == "6"

    summary = core.resumer_configuration(config)
    assert "31 x 12 cellules" in summary
    transition = core.resumer_transition(config)
    assert "0 transition" in transition or "Mode table" in transition
    hud = core.etiquette_regle_hud({
        "neighborhood": "5",
        "channels": "2",
        "ruleMode": "numerique",
        "wolframRule": "90",
    })
    assert hud == "R5x2"

    built = core.construire_configuration_regle_generee({
        "alphabet_entree": [0, 1],
        "alphabet_sortie": [0, 1],
        "taille_voisinage": 3,
        "nombre_canaux_sortie": 1,
        "mode_regle": "table",
    }, "wolfram", 90)
    assert built["effectiveGenerator"] == "wolfram"
    assert built["config"]["table_transition"]["[1,1,0]"] == [1]

    ensured = core.assurer_configuration_rendable({
        "alphabet_entree": [0, 1],
        "alphabet_sortie": [0, 1],
        "taille_voisinage": 3,
        "nombre_canaux_sortie": 1,
        "mode_regle": "table",
    })
    assert len(ensured["table_transition"]) > 0

    desc = core.decrire_configuration(ensured)
    assert "title" in desc and "ruleTableHtml" in desc
    signals = core.signaux_transition(ensured)
    assert len(signals) > 0
    assert "regles possibles" in core.etiquette_espace_regles(ensured)


if __name__ == "__main__":
    core = load_core()
    test_wolfram_table(core)
    test_symmetric_table(core)
    test_detailed_universe(core)
    test_validation(core)
    test_deterministic_random_helper(core)
    test_form_and_summary_helpers(core)
    print("french core smoke ok")
