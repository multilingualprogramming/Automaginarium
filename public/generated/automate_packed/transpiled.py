# pylint: skip-file
def cle_binaire_3(gauche, centre, droite):
    return (((gauche * 4) + (centre * 2)) + droite)
def sortie_wolfram(numero_regle, motif):
    indice = (motif % 8)
    diviseur = 1
    for rang in range(indice):
        diviseur = (diviseur * 2)
    return ((numero_regle // diviseur) % 2)
def cellule_wolfram(numero_regle, gauche, centre, droite):
    return sortie_wolfram(numero_regle, cle_binaire_3(gauche, centre, droite))
def sortie_totalistique(somme_voisinage, taille_alphabet, canal):
    if (taille_alphabet <= 0):
        return 0
    return ((somme_voisinage + canal) % taille_alphabet)
def cellule_totalistique_3(gauche, centre, droite, taille_alphabet):
    return sortie_totalistique(((gauche + centre) + droite), taille_alphabet, 0)
def lire_bord_fixe(valeur, valeur_repli):
    return (valeur if (valeur >= 0) else valeur_repli)
def taille_voisinage_normalisee(taille):
    if (taille < 1):
        return 1
    if ((taille % 2) == 0):
        return (taille + 1)
    return taille
def sortie_table_code(code_sortie, taille_alphabet):
    if (taille_alphabet <= 0):
        return 0
    return (code_sortie % taille_alphabet)
def validation_mode_regle(code_mode):
    return (1 if ((code_mode == 0) or (code_mode == 1) or (code_mode == 2)) else 0)
