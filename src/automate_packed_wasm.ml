# Automaginarium - noyau numerique etroit pour le navigateur.
#
# Ce module evite les dictionnaires et listes imbriquees afin de donner au
# pipeline WebAssembly une ABI stable. Le noyau riche reste dans
# automate_universel.ml; ce fichier expose les primitives que JavaScript peut
# appeler sans redevenir le moteur conceptuel.


def cle_binaire_3(gauche, centre, droite):
    retour gauche * 4 + centre * 2 + droite


def sortie_wolfram(numero_regle, motif):
    soit indice = motif % 8
    soit diviseur = 1
    pour rang in range(indice):
        diviseur = diviseur * 2
    retour (numero_regle // diviseur) % 2


def cellule_wolfram(numero_regle, gauche, centre, droite):
    retour sortie_wolfram(numero_regle, cle_binaire_3(gauche, centre, droite))


def sortie_totalistique(somme_voisinage, taille_alphabet, canal):
    si taille_alphabet <= 0:
        retour 0
    retour (somme_voisinage + canal) % taille_alphabet


def cellule_totalistique_3(gauche, centre, droite, taille_alphabet):
    retour sortie_totalistique(gauche + centre + droite, taille_alphabet, 0)


def code_voisinage_accumule(code_courant, valeur, taille_alphabet):
    si taille_alphabet <= 1:
        retour code_courant
    retour code_courant * taille_alphabet + valeur


def code_voisinage_3_base(valeur_a, valeur_b, valeur_c, taille_alphabet):
    soit code = 0
    code = code_voisinage_accumule(code, valeur_a, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_b, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_c, taille_alphabet)
    retour code


def code_voisinage_5_base(valeur_a, valeur_b, valeur_c, valeur_d, valeur_e, taille_alphabet):
    soit code = 0
    code = code_voisinage_accumule(code, valeur_a, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_b, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_c, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_d, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_e, taille_alphabet)
    retour code


def somme_voisinage_5(valeur_a, valeur_b, valeur_c, valeur_d, valeur_e):
    retour valeur_a + valeur_b + valeur_c + valeur_d + valeur_e


def cellule_totalistique_5(valeur_a, valeur_b, valeur_c, valeur_d, valeur_e, taille_alphabet):
    retour sortie_totalistique(somme_voisinage_5(valeur_a, valeur_b, valeur_c, valeur_d, valeur_e), taille_alphabet, 0)


def lire_bord_fixe(valeur, valeur_repli):
    retour valeur si valeur >= 0 sinon valeur_repli


def taille_voisinage_normalisee(taille):
    si taille < 1:
        retour 1
    si taille % 2 == 0:
        retour taille + 1
    retour taille


def sortie_table_code(code_sortie, taille_alphabet):
    si taille_alphabet <= 0:
        retour 0
    retour code_sortie % taille_alphabet


def entier_pseudo_aleatoire(graine, identifiant):
    soit base = graine + 12345
    soit melange = (base + (identifiant * 1103515245)) % 2147483647
    retour melange


def indice_aleatoire_deterministe(graine, identifiant, taille_alphabet):
    si taille_alphabet <= 0:
        retour 0
    retour entier_pseudo_aleatoire(graine, identifiant) % taille_alphabet


def validation_mode_regle(code_mode):
    # 0=table, 1=totalistique, 2=aleatoire
    si code_mode == 0:
        retour 1
    si code_mode == 1:
        retour 1
    si code_mode == 2:
        retour 1
    retour 0


# ============================================================================
# FITNESS SCALAIRES: Fonctions numériques pour l'evolution genetique
# Toutes ces fonctions prennent et retournent des f64 (compatibilité WASM)
# ============================================================================

def fitness_complexite_scalaire(entropie, compacite):
    """entropie et compacite en [0..1]. Retourne entropie * (1 - compacite) capped [0..1]."""
    soit score = entropie * (1.0 - compacite)
    retour max(0.0, min(1.0, score))


def fitness_stabilite_scalaire(taux_croissance_abs, compacite):
    """Low growth + high compactness = stable."""
    soit stabilite = (1.0 - min(1.0, taux_croissance_abs)) * 0.5 + compacite * 0.5
    retour max(0.0, min(1.0, stabilite))


def fitness_symetrie_scalaire(symetrie):
    """symetrie en [0..1]. Bell curve peaked at 0.7."""
    soit diff = abs(symetrie - 0.7)
    soit score = 1.0 - (diff / 0.7)
    retour max(0.0, min(1.0, score))


def fitness_densite_scalaire(densite, cible):
    """Distance-based fitness: highest at cible."""
    soit diff = abs(densite - cible)
    soit score = 1.0 - min(1.0, diff * 2.0)
    retour max(0.0, min(1.0, score))


def fitness_croissance_scalaire(taux_croissance):
    """Positive growth scores well."""
    retour max(0.0, min(1.0, taux_croissance))


def fitness_ponderee_scalaire(f_sym, f_den, f_sta, f_osc, f_cmp, f_cro, w_sym, w_den, w_sta, w_osc, w_cmp, w_cro):
    """Weighted sum of 6 fitness scores. Normalizes to [0..1]."""
    soit somme = (f_sym * w_sym) + (f_den * w_den) + (f_sta * w_sta) + (f_osc * w_osc) + (f_cmp * w_cmp) + (f_cro * w_cro)
    soit total_poids = w_sym + w_den + w_sta + w_osc + w_cmp + w_cro
    si total_poids <= 0:
        retour 0.0
    soit score = somme / total_poids
    retour max(0.0, min(1.0, score))


def intensite_radiale_scalaire(dx, dy, rayon):
    """Euclidean distance falloff: max(0, 1 - dist/rayon)."""
    soit distance = (dx * dx + dy * dy) ** 0.5
    si rayon <= 0:
        retour 0.0
    soit intensite = 1.0 - (distance / rayon)
    retour max(0.0, min(1.0, intensite))


def variance_scalaire_3(valeur_a, valeur_b, valeur_c):
    """Variance of three values."""
    soit moyenne = (valeur_a + valeur_b + valeur_c) / 3.0
    soit variance = ((valeur_a - moyenne) ** 2 + (valeur_b - moyenne) ** 2 + (valeur_c - moyenne) ** 2) / 3.0
    retour (variance ** 0.5)


def variance_scalaire_5(valeur_a, valeur_b, valeur_c, valeur_d, valeur_e):
    """Variance of five values."""
    soit moyenne = (valeur_a + valeur_b + valeur_c + valeur_d + valeur_e) / 5.0
    soit variance = ((valeur_a - moyenne) ** 2 + (valeur_b - moyenne) ** 2 + (valeur_c - moyenne) ** 2 + (valeur_d - moyenne) ** 2 + (valeur_e - moyenne) ** 2) / 5.0
    retour (variance ** 0.5)
