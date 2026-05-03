importer json
importer random

# Automaginarium - noyau canonique en Multilingual francais.
#
# Ce fichier est nouveau pour Automaginarium, mais il reprend l'intention
# architecturale de Cellcosmos: garder la logique d'automate dans du code
# Multilingual lisible, puis laisser le navigateur s'occuper du rendu.
#
# Concepts principaux: alphabet, voisinage, etat, regle,
# table_de_transition, generation, univers, cellule, sortie, canal,
# configuration.


def normaliser_configuration(configuration):
    soit alphabet_entree = configuration.get("alphabet_entree", [0, 1])
    soit alphabet_sortie = configuration.get("alphabet_sortie", alphabet_entree)
    soit taille_voisinage = int(configuration.get("taille_voisinage", 3))
    soit nombre_canaux_sortie = int(configuration.get("nombre_canaux_sortie", 1))
    soit mode_regle = configuration.get("mode_regle", "table")
    soit largeur = int(configuration.get("largeur", 161))
    soit hauteur = int(configuration.get("hauteur", 100))

    si taille_voisinage < 1:
        taille_voisinage = 1
    si taille_voisinage % 2 == 0:
        taille_voisinage = taille_voisinage + 1
    si nombre_canaux_sortie < 1:
        nombre_canaux_sortie = 1

    retour {
        "nom": configuration.get("nom", "Univers sans nom"),
        "alphabet_entree": alphabet_entree,
        "alphabet_sortie": alphabet_sortie,
        "taille_voisinage": taille_voisinage,
        "nombre_canaux_sortie": nombre_canaux_sortie,
        "mode_regle": mode_regle,
        "table_transition": configuration.get("table_transition", {}),
        "frontiere": configuration.get("frontiere", "fixe"),
        "valeur_frontiere": configuration.get("valeur_frontiere", alphabet_entree[0]),
        "largeur": largeur,
        "hauteur": hauteur,
        "etat_initial": configuration.get("etat_initial", {"mode": "centre"}),
        "rendu": configuration.get("rendu", {}),
    }


def cle_voisinage(voisinage):
    retour json.dumps(voisinage).replace(", ", ",")


def ancienne_cle_voisinage(voisinage):
    retour "".join([str(valeur) pour valeur dans voisinage])


def toutes_cles_voisinage(alphabet, taille):
    soit cles = []

    def visiter(prefixe, profondeur):
        si profondeur == taille:
            cles.append(cle_voisinage(prefixe))
            retour
        pour symbole dans alphabet:
            soit suivant = list(prefixe)
            suivant.append(symbole)
            visiter(suivant, profondeur + 1)

    visiter([], 0)
    retour cles


def sortie_defaut(configuration):
    soit alphabet_sortie = configuration["alphabet_sortie"]
    soit valeur = alphabet_sortie[0] si len(alphabet_sortie) > 0 sinon 0
    retour [valeur pour _ dans range(configuration["nombre_canaux_sortie"])]


def lire_cellule(ligne, indice, configuration):
    soit largeur = len(ligne)
    si 0 <= indice < largeur:
        retour ligne[indice]
    si configuration.get("frontiere", "fixe") == "circulaire" et largeur > 0:
        retour ligne[indice % largeur]
    retour configuration.get("valeur_frontiere", 0)


def voisinage_cellule(ligne, indice, configuration):
    soit taille = configuration["taille_voisinage"]
    soit rayon = taille // 2
    retour [lire_cellule(ligne, indice + decalage, configuration) pour decalage dans range(0 - rayon, rayon + 1)]


def transition_table(voisinage, configuration):
    soit table = configuration.get("table_transition", {})
    soit cle = cle_voisinage(voisinage)
    soit ancienne_cle = ancienne_cle_voisinage(voisinage)
    soit sortie = table.get(cle, table.get(ancienne_cle, sortie_defaut(configuration)))
    si non isinstance(sortie, list):
        sortie = [sortie]
    si len(sortie) < configuration["nombre_canaux_sortie"]:
        soit premiere = sortie[0] si len(sortie) > 0 sinon configuration["alphabet_sortie"][0]
        pour canal_manquant dans range(configuration["nombre_canaux_sortie"] - len(sortie)):
            sortie.append(premiere)
    retour sortie


def transition_totalistique(voisinage, configuration):
    soit somme = 0
    pour valeur dans voisinage:
        somme = somme + int(valeur)
    soit alphabet = configuration["alphabet_sortie"]
    soit sortie = []
    pour canal dans range(configuration["nombre_canaux_sortie"]):
        sortie.append(alphabet[(somme + canal) % len(alphabet)])
    retour sortie


def table_wolfram(numero_regle):
    soit table = {}
    pour motif dans range(8):
        soit gauche = (motif // 4) % 2
        soit centre = (motif // 2) % 2
        soit droite = motif % 2
        table[cle_voisinage([gauche, centre, droite])] = [(numero_regle // (2 ** motif)) % 2]
    retour table


def table_totalistique(configuration):
    soit config = normaliser_configuration(configuration)
    soit table = {}
    soit cles = toutes_cles_voisinage(config["alphabet_entree"], config["taille_voisinage"])
    pour cle dans cles:
        soit voisinage = json.loads(cle)
        table[cle] = transition_totalistique(voisinage, config)
    retour table


def sortie_aleatoire(configuration, generateur):
    soit sortie = []
    pour canal dans range(configuration["nombre_canaux_sortie"]):
        sortie.append(generateur.choice(configuration["alphabet_sortie"]))
    retour sortie


def table_aleatoire(configuration, graine=42):
    soit config = normaliser_configuration(configuration)
    soit generateur = random.Random(graine)
    soit table = {}
    soit cles = toutes_cles_voisinage(config["alphabet_entree"], config["taille_voisinage"])
    pour cle dans cles:
        table[cle] = sortie_aleatoire(config, generateur)
    retour table


def table_symetrique(configuration, graine=42):
    soit config = normaliser_configuration(configuration)
    soit generateur = random.Random(graine)
    soit table = {}
    soit cles = toutes_cles_voisinage(config["alphabet_entree"], config["taille_voisinage"])
    pour cle dans cles:
        si cle dans table:
            continuer
        soit voisinage = json.loads(cle)
        soit miroir = list(reversed(voisinage))
        soit cle_miroir = cle_voisinage(miroir)
        soit sortie = sortie_aleatoire(config, generateur)
        table[cle] = sortie
        table[cle_miroir] = sortie
    retour table


def valider_configuration(configuration):
    soit config = normaliser_configuration(configuration)
    soit erreurs = []
    soit avertissements = []

    si len(config["alphabet_entree"]) == 0:
        erreurs.append("alphabet_entree vide")
    si len(config["alphabet_sortie"]) == 0:
        erreurs.append("alphabet_sortie vide")
    si config["taille_voisinage"] < 1 ou config["taille_voisinage"] % 2 == 0:
        erreurs.append("taille_voisinage doit etre impair et positif")
    si config["nombre_canaux_sortie"] < 1:
        erreurs.append("nombre_canaux_sortie doit etre positif")
    si config["mode_regle"] non dans ["table", "totalistique", "aleatoire", "numerique"]:
        erreurs.append("mode_regle inconnu")

    si config["mode_regle"] == "table":
        soit cles = toutes_cles_voisinage(config["alphabet_entree"], config["taille_voisinage"])
        pour cle dans cles:
            si cle non dans config["table_transition"]:
                avertissements.append("transition absente " + cle)

    retour {
        "valide": len(erreurs) == 0,
        "erreurs": erreurs,
        "avertissements": avertissements,
    }


def transition_aleatoire(voisinage, configuration, generateur):
    soit alphabet = configuration["alphabet_sortie"]
    retour [generateur.choice(alphabet) pour _ dans range(configuration["nombre_canaux_sortie"])]


def appliquer_regle(voisinage, configuration, generateur):
    soit mode = configuration.get("mode_regle", "table")
    si mode == "totalistique":
        retour transition_totalistique(voisinage, configuration)
    si mode == "aleatoire":
        retour transition_aleatoire(voisinage, configuration, generateur)
    si mode == "numerique":
        soit numero_regle = configuration.get("numero_regle", 0)
        retour sortie_regle_numerique(voisinage, numero_regle, configuration)
    retour transition_table(voisinage, configuration)


def valeur_principale(sortie):
    retour sortie[0] si len(sortie) > 0 sinon 0


def prochaine_generation(generation, configuration, graine=0):
    soit generateur = random.Random(graine)
    soit suivante = []
    pour indice dans range(len(generation)):
        soit voisinage = voisinage_cellule(generation, indice, configuration)
        soit sortie = appliquer_regle(voisinage, configuration, generateur)
        suivante.append(valeur_principale(sortie))
    retour suivante


def creer_generation_initiale(configuration):
    soit largeur = configuration["largeur"]
    soit alphabet = configuration["alphabet_entree"]
    soit vide = alphabet[0]
    soit vivant = alphabet[1] si len(alphabet) > 1 sinon alphabet[0]
    soit generation = [vide pour _ dans range(largeur)]
    soit etat_initial = configuration.get("etat_initial", {"mode": "centre"})
    soit mode = etat_initial.get("mode", "centre")

    si mode == "aleatoire":
        soit generateur = random.Random(etat_initial.get("graine", 42))
        soit probabilite = etat_initial.get("probabilite", 0.28)
        retour [generateur.choice(alphabet) si generateur.random() < probabilite sinon vide pour _ dans range(largeur)]

    si mode == "motif":
        soit motif = etat_initial.get("valeurs", [])
        soit debut = max(0, (largeur - len(motif)) // 2)
        pour indice_motif dans range(len(motif)):
            si debut + indice_motif < largeur:
                generation[debut + indice_motif] = motif[indice_motif]
        retour generation

    generation[largeur // 2] = vivant
    retour generation


def generer_univers(configuration_brute):
    soit configuration = normaliser_configuration(configuration_brute)
    soit lignes = []
    lignes.append(creer_generation_initiale(configuration))
    pour rang dans range(1, configuration["hauteur"]):
        lignes.append(prochaine_generation(lignes[rang - 1], configuration, rang))
    retour lignes


def charger_configuration(chemin):
    avec open(chemin, "r", encoding="utf-8") comme fichier:
        retour normaliser_configuration(json.load(fichier))


# Variante detaillee pour les prochains stages: elle garde les sorties
# multicanaux calculees pour chaque cellule, afin que le rendu puisse mapper
# un canal vers la couleur, un autre vers le son, etc.
def prochaine_generation_detaillee(generation, configuration, graine=0):
    soit generateur = random.Random(graine)
    soit suivante = []
    soit sorties = []
    pour indice dans range(len(generation)):
        soit voisinage = voisinage_cellule(generation, indice, configuration)
        soit sortie = appliquer_regle(voisinage, configuration, generateur)
        sorties.append(sortie)
        suivante.append(valeur_principale(sortie))
    retour {"generation": suivante, "sorties": sorties}


def generer_univers_detaille(configuration_brute):
    soit configuration = normaliser_configuration(configuration_brute)
    soit lignes = []
    soit sorties = []
    lignes.append(creer_generation_initiale(configuration))
    sorties.append([[valeur] pour valeur dans lignes[0]])
    pour rang dans range(1, configuration["hauteur"]):
        soit detail = prochaine_generation_detaillee(lignes[rang - 1], configuration, rang)
        lignes.append(detail["generation"])
        sorties.append(detail["sorties"])
    retour {"configuration": configuration, "lignes": lignes, "sorties": sorties}


# Fonctions pour les regles numeriques: les regles sont encodees comme des grands entiers
# plutot que des tables de transition explicites.

def configuration_regle(configuration):
    soit s = len(configuration["alphabet_entree"])
    soit k = configuration["taille_voisinage"]
    soit t = len(configuration["alphabet_sortie"])
    soit m = configuration["nombre_canaux_sortie"]
    soit base = t ** m
    soit chiffres = s ** k
    retour {
        "s": s,
        "k": k,
        "t": t,
        "m": m,
        "base": base,
        "chiffres": chiffres,
    }


def voisinage_vers_index(voisinage, alphabet):
    soit s = len(alphabet)
    soit index = 0
    pour valeur dans voisinage:
        soit indice_symbole = alphabet.index(valeur) si valeur dans alphabet sinon 0
        index = index * s + indice_symbole
    retour index


def index_vers_voisinage(index, configuration):
    soit spec = configuration_regle(configuration)
    soit s = spec["s"]
    soit k = spec["k"]
    soit voisinage = []
    soit restant = index
    pour indice_puissance dans range(k - 1, -1, -1):
        soit indice_symbole = restant // (s ** indice_puissance)
        voisinage.append(configuration["alphabet_entree"][indice_symbole])
        restant = restant % (s ** indice_puissance)
    retour voisinage


def sortie_vers_chiffre_regle(sortie, configuration):
    soit spec = configuration_regle(configuration)
    soit t = spec["t"]
    soit m = spec["m"]
    soit chiffre = 0
    soit valeurs = sortie si isinstance(sortie, list) sinon [sortie]
    pour canal dans range(m):
        soit valeur = valeurs[canal] si canal < len(valeurs) sinon valeurs[0] si len(valeurs) > 0 sinon configuration["alphabet_sortie"][0]
        soit indice_symbole = configuration["alphabet_sortie"].index(valeur) si valeur dans configuration["alphabet_sortie"] sinon 0
        chiffre = chiffre * t + indice_symbole
    retour chiffre


def chiffre_regle_vers_sortie(chiffre, configuration):
    soit spec = configuration_regle(configuration)
    soit t = spec["t"]
    soit m = spec["m"]
    soit sortie = []
    soit restant = chiffre
    pour canal dans range(m - 1, -1, -1):
        soit indice_symbole = restant // (t ** canal)
        sortie.append(configuration["alphabet_sortie"][indice_symbole])
        restant = restant % (t ** canal)
    sortie.reverse()
    retour sortie


def sortie_regle_numerique(voisinage, numero_regle, configuration):
    soit index = voisinage_vers_index(voisinage, configuration["alphabet_entree"])
    soit spec = configuration_regle(configuration)
    soit base = spec["base"]
    soit chiffre = (numero_regle // (base ** index)) % base
    retour chiffre_regle_vers_sortie(chiffre, configuration)


# ============================================================================
# ALGORITHME GENETIQUE: Operateurs et fitness pour evolution de regles
# ============================================================================

def croisement_table_uniforme(table_a, table_b, graine):
    """Uniform crossover on table_transition keys.
    Each key has equal probability of coming from table_a or table_b."""
    soit gen = random.Random(graine)
    soit cles_a = set(table_a.keys())
    soit cles_b = set(table_b.keys())
    soit cles_union = cles_a | cles_b
    soit table_enfant = {}
    pour cle dans cles_union:
        soit parent = table_a si gen.random() < 0.5 sinon table_b
        si cle dans parent:
            table_enfant[cle] = list(parent[cle]) si isinstance(parent[cle], list) sinon [parent[cle]]
    retour table_enfant


def croisement_table_1pt(table_a, table_b, point_sur_n, cles):
    """One-point crossover on ordered list of neighborhood keys.
    Keys before point_sur_n come from table_a, rest from table_b."""
    soit table_enfant = {}
    pour indice dans range(len(cles)):
        soit cle = cles[indice]
        soit parent = table_a si indice < point_sur_n sinon table_b
        si cle dans parent:
            table_enfant[cle] = list(parent[cle]) si isinstance(parent[cle], list) sinon [parent[cle]]
    retour table_enfant


def muter_table(table, cles, alphabet_sortie, nombre_canaux, taux_sur_1000, graine):
    """Randomly replace some output values with random alphabet values.
    Probability of mutation per entry is taux_sur_1000/1000."""
    soit gen = random.Random(graine)
    soit table_mutee = {}
    pour cle dans cles:
        soit sortie = table.get(cle, [alphabet_sortie[0] pour _ dans range(nombre_canaux)])
        si non isinstance(sortie, list):
            sortie = [sortie]
        soit sortie_mutee = []
        pour canal dans range(nombre_canaux):
            soit valeur = sortie[canal] si canal < len(sortie) sinon alphabet_sortie[0]
            si gen.random() < (taux_sur_1000 / 1000.0):
                valeur = gen.choice(alphabet_sortie)
            sortie_mutee.append(valeur)
        table_mutee[cle] = sortie_mutee
    retour table_mutee


def individu_aleatoire(configuration, graine):
    """Returns a new config with a fresh random table_transition."""
    soit config_copie = dict(configuration)
    config_copie["table_transition"] = table_aleatoire(config_copie, graine)
    retour config_copie


def individu_mutation_depuis(config_parent, taux_sur_1000, graine):
    """Returns a lightly mutated copy of parent config."""
    soit config = normaliser_configuration(config_parent)
    soit cles = toutes_cles_voisinage(config["alphabet_entree"], config["taille_voisinage"])
    soit table_mutee = muter_table(config["table_transition"], cles, config["alphabet_sortie"], config["nombre_canaux_sortie"], taux_sur_1000, graine)
    soit config_mutee = dict(config)
    config_mutee["table_transition"] = table_mutee
    retour config_mutee


def population_initiale(config_base, taille, graine):
    """Creates taille individuals: first half mutations from config_base,
    second half fully random."""
    soit gen = random.Random(graine)
    soit population = []
    soit config = normaliser_configuration(config_base)
    soit moitie = taille // 2

    pour indice_iteration dans range(moitie):
        soit graine_mutation = gen.randint(0, 2147483647)
        soit individu = individu_mutation_depuis(config, 120, graine_mutation)
        population.append(individu)

    pour indice_iteration dans range(taille - moitie):
        soit graine_aleatoire = gen.randint(0, 2147483647)
        soit individu = individu_aleatoire(config, graine_aleatoire)
        population.append(individu)

    retour population


def selection_tournoi(scores, taille_tournoi, graine):
    """Tournament selection: picks k indices at random, returns index of highest score."""
    soit gen = random.Random(graine)
    soit candidats = [gen.randint(0, len(scores) - 1) pour _ dans range(min(taille_tournoi, len(scores)))]
    retour max(candidats, key=lambda indice_candidat: scores[indice_candidat])


def nouvelle_generation(population, scores, taux_mutation_sur_1000, graine):
    """Produces next generation via tournament selection + uniform crossover + mutation.
    Preserves best individual (elitism)."""
    soit gen = random.Random(graine)
    soit nouvelle = []
    soit meilleur_indice = max(range(len(scores)), key=lambda indice_score: scores[indice_score])
    soit meilleur_config = population[meilleur_indice]
    nouvelle.append(meilleur_config)

    pour indice_iteration dans range(len(population) - 1):
        soit graine_tournoi_a = gen.randint(0, 2147483647)
        soit graine_tournoi_b = gen.randint(0, 2147483647)
        soit indice_a = selection_tournoi(scores, 3, graine_tournoi_a)
        soit indice_b = selection_tournoi(scores, 3, graine_tournoi_b)

        soit config_parent_a = normaliser_configuration(population[indice_a])
        soit config_parent_b = normaliser_configuration(population[indice_b])

        soit cles = toutes_cles_voisinage(config_parent_a["alphabet_entree"], config_parent_a["taille_voisinage"])
        soit graine_crossover = gen.randint(0, 2147483647)
        soit table_enfant = croisement_table_uniforme(config_parent_a["table_transition"], config_parent_b["table_transition"], graine_crossover)

        soit config_enfant = dict(config_parent_a)
        config_enfant["table_transition"] = table_enfant

        soit graine_mutation = gen.randint(0, 2147483647)
        config_enfant = individu_mutation_depuis(config_enfant, taux_mutation_sur_1000, graine_mutation)
        nouvelle.append(config_enfant)

    retour nouvelle


# ============================================================================
# FONCTIONS DE FITNESS: Scoring criteria for genetic evolution
# ============================================================================

def fitness_complexite(entropie, compacite):
    """Combined complexity score: high entropy + low compactness = complex.
    entropie and compacite are values in [0..1]."""
    retour min(1.0, entropie * (1.0 - compacite))


def fitness_stabilite(taux_croissance_abs, compacite):
    """Low absolute growth rate + high compactness = stable."""
    soit stabilite_croissance = 1.0 - min(1.0, abs(taux_croissance_abs))
    retour (stabilite_croissance * 0.5) + (compacite * 0.5)


def fitness_oscillation(variance_densite, periode_detectable):
    """Medium variance in density + detectable period."""
    soit score_variance = 1.0 - min(1.0, abs(variance_densite - 0.5) * 2.0)
    soit score_periode = 1.0 si periode_detectable > 0 sinon 0.0
    retour (score_variance * 0.7) + (score_periode * 0.3)


def fitness_croissance(taux_croissance):
    """High positive growth rate scores well."""
    retour max(0.0, min(1.0, taux_croissance))


def fitness_ponderee(f_sym, f_den, f_sta, f_osc, f_cmp, f_cro, poids):
    """Weighted sum of 6 fitness scores. poids = [w_sym, w_den, w_sta, w_osc, w_cmp, w_cro]."""
    soit somme = (f_sym * poids[0]) + (f_den * poids[1]) + (f_sta * poids[2]) + (f_osc * poids[3]) + (f_cmp * poids[4]) + (f_cro * poids[5])
    soit total_poids = sum(poids)
    soit score = somme / total_poids si total_poids > 0 sinon 0.0
    retour max(0.0, min(1.0, score))


def preset_fitness_beau():
    """Preset: high symmetry + mid density + moderate complexity."""
    retour [8, 5, 3, 2, 4, 1]


def preset_fitness_chaotique():
    """Preset: high entropy + low compactness + variable growth."""
    retour [1, 3, 1, 2, 9, 2]


def preset_fitness_stable():
    """Preset: low growth + high compactness + high symmetry."""
    retour [3, 4, 9, 1, 5, 0]


def preset_fitness_croissance():
    """Preset: high growth rate + moderate structure."""
    retour [2, 3, 0, 1, 3, 9]


def preset_fitness_oscillant():
    """Preset: medium entropy + strong oscillation + symmetry."""
    retour [4, 5, 3, 9, 5, 1]


# ============================================================================
# PERTURBATION: Interactive event injection into cellular automata
# ============================================================================

def perturbation_intensite_cellule(position_x, position_y, cx, cy, rayon):
    """Euclidean distance falloff: 1.0 at center, 0.0 at edge."""
    soit distance = ((position_x - cx) ** 2 + (position_y - cy) ** 2) ** 0.5
    retour max(0.0, 1.0 - (distance / max(1, rayon)))


def perturbation_pulse(ligne, cx, rayon, alphabet, force_sur_1000, graine):
    """Injects random alphabet values within radius with intensity-weighted probability."""
    soit gen = random.Random(graine)
    soit ligne_perturbee = list(ligne)
    soit probabilite_base = force_sur_1000 / 1000.0

    pour position_x dans range(max(0, cx - rayon), min(len(ligne), cx + rayon + 1)):
        soit intensite = perturbation_intensite_cellule(position_x, 0, cx, 0, rayon)
        soit probabilite = min(1.0, probabilite_base * intensite)
        si gen.random() < probabilite:
            ligne_perturbee[position_x] = gen.choice(alphabet)

    retour ligne_perturbee


def perturbation_effacer(ligne, cx, rayon, valeur_defaut, force_sur_1000):
    """Clears cells to valeur_defaut with intensity-weighted probability."""
    soit ligne_effacee = list(ligne)
    soit probabilite_base = force_sur_1000 / 1000.0

    pour position_x dans range(max(0, cx - rayon), min(len(ligne), cx + rayon + 1)):
        soit intensite = perturbation_intensite_cellule(position_x, 0, cx, 0, rayon)
        soit probabilite = min(1.0, probabilite_base * intensite)
        si random.random() < probabilite:
            ligne_effacee[position_x] = valeur_defaut

    retour ligne_effacee


def perturbation_inverser(ligne, cx, rayon, alphabet, force_sur_1000, graine):
    """Flips each cell to a random other alphabet value within radius."""
    soit gen = random.Random(graine)
    soit ligne_inversee = list(ligne)
    soit probabilite_base = force_sur_1000 / 1000.0

    pour position_x dans range(max(0, cx - rayon), min(len(ligne), cx + rayon + 1)):
        soit intensite = perturbation_intensite_cellule(position_x, 0, cx, 0, rayon)
        soit probabilite = min(1.0, probabilite_base * intensite)
        si gen.random() < probabilite:
            soit autres = [valeur_alternative pour valeur_alternative dans alphabet si valeur_alternative != ligne[position_x]]
            si len(autres) > 0:
                ligne_inversee[position_x] = gen.choice(autres)

    retour ligne_inversee


def perturbation_attirer(ligne, cx, rayon, valeur_attrait, force_sur_1000):
    """Biases cells toward valeur_attrait."""
    soit ligne_attirante = list(ligne)
    soit probabilite_base = force_sur_1000 / 1000.0

    pour position_x dans range(max(0, cx - rayon), min(len(ligne), cx + rayon + 1)):
        soit intensite = perturbation_intensite_cellule(position_x, 0, cx, 0, rayon)
        soit probabilite = min(1.0, probabilite_base * intensite)
        si random.random() < probabilite:
            ligne_attirante[position_x] = valeur_attrait

    retour ligne_attirante


def perturbation_geler(masque_gel, cx, cy, rayon, largeur, duree_generations):
    """Updates freeze mask: {x: remaining_generations}.
    Cells in radius get duree_generations added to their count."""
    soit masque_nouveau = dict(masque_gel)

    pour position_x dans range(max(0, cx - rayon), min(largeur, cx + rayon + 1)):
        soit cle_x = str(position_x)
        si cle_x dans masque_nouveau:
            masque_nouveau[cle_x] = masque_nouveau[cle_x] + duree_generations
        sinon:
            masque_nouveau[cle_x] = duree_generations

    retour masque_nouveau


def appliquer_masque_gel(ligne, masque_gel, ligne_gelee):
    """Preserves frozen cells at their stored values."""
    soit ligne_resultat = list(ligne)

    pour cle_x dans masque_gel:
        soit position_x = int(cle_x)
        si 0 <= position_x < len(ligne_resultat) et cle_x dans ligne_gelee:
            ligne_resultat[position_x] = ligne_gelee[cle_x]

    retour ligne_resultat


def decrementer_masque_gel(masque_gel):
    """Reduces each key's count by 1; removes keys at 0."""
    soit masque_nouveau = {}

    pour cle dans masque_gel:
        soit compte = masque_gel[cle] - 1
        si compte > 0:
            masque_nouveau[cle] = compte

    retour masque_nouveau


def variance_densite(historique_densites):
    """Returns variance of densities across generation history."""
    si len(historique_densites) < 2:
        retour 0.0

    soit moyenne = sum(historique_densites) / len(historique_densites)
    soit somme_carres = sum([(densite - moyenne) ** 2 pour densite dans historique_densites])
    retour (somme_carres / len(historique_densites)) ** 0.5


def detecter_periode(historique_densites, fenetre):
    """Checks autocorrelation in last `fenetre` densities.
    Returns estimated period (1..fenetre//2) or 0 if none found."""
    si len(historique_densites) < fenetre or fenetre < 2:
        retour 0

    soit derniers = historique_densites[-fenetre:]

    pour periode dans range(1, fenetre // 2 + 1):
        soit correlation = 0.0
        soit compte = 0
        pour indice_dernier dans range(len(derniers) - periode):
            soit diff = abs(derniers[indice_dernier] - derniers[indice_dernier + periode])
            correlation = correlation + diff
            compte = compte + 1

        soit correlation_moyenne = correlation / compte si compte > 0 sinon 0.0
        si correlation_moyenne < 0.1:
            retour periode

    retour 0
