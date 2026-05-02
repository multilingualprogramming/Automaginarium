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


def code_voisinage_3_base(a, b, c, taille_alphabet):
    soit code = 0
    code = code_voisinage_accumule(code, a, taille_alphabet)
    code = code_voisinage_accumule(code, b, taille_alphabet)
    code = code_voisinage_accumule(code, c, taille_alphabet)
    retour code


def code_voisinage_5_base(a, b, c, d, valeur_e, taille_alphabet):
    soit code = 0
    code = code_voisinage_accumule(code, a, taille_alphabet)
    code = code_voisinage_accumule(code, b, taille_alphabet)
    code = code_voisinage_accumule(code, c, taille_alphabet)
    code = code_voisinage_accumule(code, d, taille_alphabet)
    code = code_voisinage_accumule(code, valeur_e, taille_alphabet)
    retour code


def somme_voisinage_5(a, b, c, d, valeur_e):
    retour a + b + c + d + valeur_e


def cellule_totalistique_5(a, b, c, d, valeur_e, taille_alphabet):
    retour sortie_totalistique(somme_voisinage_5(a, b, c, d, valeur_e), taille_alphabet, 0)


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


def validation_mode_regle(code_mode):
    # 0=table, 1=totalistique, 2=aleatoire
    si code_mode == 0:
        retour 1
    si code_mode == 1:
        retour 1
    si code_mode == 2:
        retour 1
    retour 0
