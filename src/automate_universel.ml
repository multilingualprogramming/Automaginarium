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
