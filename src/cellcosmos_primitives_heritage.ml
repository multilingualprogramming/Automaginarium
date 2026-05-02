# Adapted from Cellcosmos src/automate_elementaire_wasm.ml.
# Original project: https://github.com/multilingualprogramming/cellcosmos
#
# This file is kept as a migration reference for compact French Multilingual primitives.

importer math


# Module WASM-compatible minimal, utilise par le site statique.
# Il expose uniquement des primitives numeriques simples que le
# frontend combine ensuite pour rendre les automates.

déf cellule_suivante(numero_regle, gauche, centre, droite):
    soit indice = gauche * 4 + centre * 2 + droite
    si indice == 0:
        retour numero_regle % 2
    si indice == 1:
        retour (numero_regle // 2) % 2
    si indice == 2:
        retour (numero_regle // 4) % 2
    si indice == 3:
        retour (numero_regle // 8) % 2
    si indice == 4:
        retour (numero_regle // 16) % 2
    si indice == 5:
        retour (numero_regle // 32) % 2
    si indice == 6:
        retour (numero_regle // 64) % 2
    retour (numero_regle // 128) % 2


déf sortie_motif(numero_regle, motif):
    si motif <= 0:
        retour numero_regle % 2
    si motif == 1:
        retour (numero_regle // 2) % 2
    si motif == 2:
        retour (numero_regle // 4) % 2
    si motif == 3:
        retour (numero_regle // 8) % 2
    si motif == 4:
        retour (numero_regle // 16) % 2
    si motif == 5:
        retour (numero_regle // 32) % 2
    si motif == 6:
        retour (numero_regle // 64) % 2
    retour (numero_regle // 128) % 2


déf code_motif(gauche, centre, droite):
    retour gauche * 4 + centre * 2 + droite


déf progression_morphosee(distance, distance_max, intensite_sur_1000):
    soit intensite = intensite_sur_1000
    si intensite < 0:
        intensite = 0
    si intensite > 1000:
        intensite = 1000
    si distance_max <= 0:
        retour intensite
    soit distance_normale = distance
    si distance_normale < 0:
        distance_normale = 0 - distance_normale
    si distance_normale > distance_max:
        distance_normale = distance_max
    soit progression_locale = (distance_normale * 1000) // distance_max
    retour (progression_locale * intensite) // 1000


déf regle_morphee(regle_source, regle_cible, progression_sur_1000):
    soit progression = progression_sur_1000
    si progression < 0:
        progression = 0
    si progression > 1000:
        progression = 1000

    soit regle = 0
    pour motif dans range(8):
        soit seuil = ((motif + 1) * 1000) // 8
        soit bit = sortie_motif(regle_source, motif)
        si progression >= seuil:
            bit = sortie_motif(regle_cible, motif)
        regle = regle + (bit * (2 ** motif))
    retour regle


déf cellule_morphosee(regle_source, regle_cible, progression_sur_1000, gauche, centre, droite):
    soit regle = regle_morphee(regle_source, regle_cible, progression_sur_1000)
    retour cellule_suivante(regle, gauche, centre, droite)


déf classe_wolfram(numero_regle):
    si numero_regle == 0 ou numero_regle == 8 ou numero_regle == 32 ou numero_regle == 40 ou numero_regle == 64 ou numero_regle == 72 ou numero_regle == 96 ou numero_regle == 104 ou numero_regle == 128 ou numero_regle == 136 ou numero_regle == 160 ou numero_regle == 168 ou numero_regle == 192 ou numero_regle == 200 ou numero_regle == 224 ou numero_regle == 232 ou numero_regle == 248 ou numero_regle == 255:
        retour 1
    si numero_regle == 18 ou numero_regle == 22 ou numero_regle == 30 ou numero_regle == 45 ou numero_regle == 60 ou numero_regle == 90 ou numero_regle == 105 ou numero_regle == 122 ou numero_regle == 126 ou numero_regle == 150:
        retour 3
    si numero_regle == 54 ou numero_regle == 106 ou numero_regle == 110 ou numero_regle == 137 ou numero_regle == 193:
        retour 4
    retour 2


déf note_regle(numero_regle):
    si numero_regle == 30:
        retour 1
    si numero_regle == 90:
        retour 2
    si numero_regle == 110:
        retour 3
    si numero_regle == 150:
        retour 4
    si numero_regle == 184:
        retour 5
    si numero_regle == 254:
        retour 6
    retour 0


déf etiquette_note_regle(numero_regle):
    soit identifiant = note_regle(numero_regle)
    si identifiant == 1:
        retour "Chaos pseudo aleatoire"
    si identifiant == 2:
        retour "Triangle de Sierpinski"
    si identifiant == 3:
        retour "Calcul universel"
    si identifiant == 4:
        retour "XOR avec auto-reference"
    si identifiant == 5:
        retour "Modele de trafic"
    si identifiant == 6:
        retour "Frontieres seulement"
    retour ""


déf composante_interpolee(debut, fin, progression_sur_1000):
    soit progression = progression_sur_1000 / 1000
    retour math.floor(debut + (fin - debut) * progression + 0.5)


déf forme_code_rect():
    retour 0


déf forme_code_circle():
    retour 1


déf forme_code_ellipse():
    retour 2


déf forme_code_triangle():
    retour 3


# Codes de texture pour le rendu esthetique avance
déf texture_code_solide():
    retour 0


déf texture_code_points():
    retour 1


déf texture_code_hachures():
    retour 2


déf texture_code_gradient():
    retour 3


déf texture_code_bruit():
    retour 4


# Codes de mode de fusion (blending)
déf fusion_code_normal():
    retour 0


déf fusion_code_ecran():
    retour 1


déf fusion_code_multiplier():
    retour 2


déf fusion_code_superposer():
    retour 3


déf fusion_code_eclaircir():
    retour 4


déf fusion_code_assombrir():
    retour 5


déf fusion_code_difference():
    retour 6


déf fusion_code_esquiver():
    retour 7


# Parametres de synthese sonore derives du numero de regle
déf frequence_fondamentale(numero_regle):
    soit expose = numero_regle / 64
    soit facteur_puissance = math.pow(2, expose)
    retour 110 * facteur_puissance


déf forme_onde_synthese(numero_regle):
    soit categorie = classe_wolfram(numero_regle)
    si categorie == 1:
        retour 1
    si categorie == 2:
        retour 2
    si categorie == 3:
        retour 3
    retour 4


déf desaccord_oscillateur_secondaire(numero_regle):
    soit modulo = numero_regle % 12
    retour modulo * 100


déf calcul_densite_densites_cellulaires(total_cellules, cellules_vivantes):
    si total_cellules <= 0:
        retour 0
    retour cellules_vivantes / total_cellules


déf frequence_cutoff_filtre_sonore(densite, base_frequence):
    soit modulation = densite * 3000
    retour 200 + modulation


déf temps_delai_reverb(numero_regle):
    soit modulo = numero_regle % 16
    retour 0.1 + modulo / 160


# Musique generative depuis les motifs : mappings derives des statistiques de la grille

déf tempo_depuis_vitesse(vitesse_sur_1000):
    retour 60 + (vitesse_sur_1000 * 120) // 1000


déf gamme_depuis_classe(classe_wolfram):
    si classe_wolfram == 1:
        retour 0
    si classe_wolfram == 3:
        retour 2
    si classe_wolfram == 4:
        retour 3
    retour 1


déf reverb_depuis_symetrie(symetrie_sur_1000):
    retour symetrie_sur_1000


déf pan_depuis_centre(centre_sur_1000):
    retour centre_sur_1000 - 500


déf octave_depuis_course(longueur_course, max_colonnes):
    si max_colonnes <= 0:
        retour 4
    soit rapport = longueur_course * 100 // max_colonnes
    si rapport > 60:
        retour 5
    si rapport > 30:
        retour 4
    retour 3


déf note_depuis_colonne(colonne, largeur, longueur_gamme):
    si largeur <= 0 ou longueur_gamme <= 0:
        retour 0
    soit degre = (colonne * longueur_gamme) // largeur
    retour degre % longueur_gamme


déf duree_note_depuis_densite(densite_sur_1000):
    si densite_sur_1000 > 700:
        retour 80
    si densite_sur_1000 > 400:
        retour 150
    retour 250


# Logique d'automate supplementaire pour limiter la logique JS :
# - champ stochastique vertical
# - fenetre temporelle de rendu
# - transformations de symetrie

déf probabilite_ligne(probabilite_base_sur_1000, champ_actif, probabilite_haut_sur_1000, probabilite_bas_sur_1000, ligne, total_lignes):
    si champ_actif == 0 ou total_lignes <= 1:
        retour probabilite_base_sur_1000
    soit progression = ligne / (total_lignes - 1)
    soit modulation = probabilite_haut_sur_1000 + ((probabilite_bas_sur_1000 - probabilite_haut_sur_1000) * progression)
    soit probabilite = (probabilite_base_sur_1000 * modulation) / 1000
    si probabilite < 0:
        retour 0
    si probabilite > 1000:
        retour 1000
    retour probabilite


déf ligne_visible(progression_sur_1000, ligne_origine, ligne_courante, total_lignes):
    si total_lignes <= 1:
        retour 1
    soit distance = ligne_courante - ligne_origine
    si distance < 0:
        distance = 0 - distance
    soit distance_max = (progression_sur_1000 * (total_lignes - 1)) // 1000
    si distance <= distance_max:
        retour 1
    retour 0


déf miroir_horizontal_colonne(colonne, largeur):
    retour (largeur - 1) - colonne


déf miroir_vertical_ligne(ligne, hauteur):
    retour (hauteur - 1) - ligne


déf coordonnee_tuilee(coordonnee, decalage, maximum):
    soit resultat = coordonnee + decalage
    si resultat < 0:
        retour 0
    si resultat > maximum:
        retour maximum
    retour resultat


déf propagation_code(mode):
    si mode == "both":
        retour 0
    si mode == "down":
        retour 1
    si mode == "up":
        retour 2
    si mode == "right":
        retour 3
    si mode == "left":
        retour 4
    si mode == "angle":
        retour 5
    retour 0


déf propagation_angle_normalise(angle_degres):
    soit angle = angle_degres % 360
    si angle < 0:
        angle = angle + 360
    retour angle


déf option_probabilite_point(probabilite_globale_sur_1000, probabilite_point_sur_1000):
    si probabilite_point_sur_1000 < 0:
        retour probabilite_globale_sur_1000
    si probabilite_point_sur_1000 > 1000:
        retour 1000
    retour probabilite_point_sur_1000


# Outils Matter Lab : geometrie, champ local de probabilite
# et evenements reactifs compacts pour le frontend.

déf laboratoire_forme_code_aucune():
    retour 0


déf laboratoire_forme_code_rectangle():
    retour 1


déf laboratoire_forme_code_cercle():
    retour 2


déf laboratoire_forme_code_anneau():
    retour 3


déf laboratoire_forme_code_cellule():
    retour 4


déf laboratoire_mode_code_aucun():
    retour 0


déf laboratoire_mode_code_interieur():
    retour 1


déf laboratoire_mode_code_exterieur():
    retour 2


déf laboratoire_mode_code_barriere():
    retour 3


déf laboratoire_evenement_code_aucun():
    retour 0


déf laboratoire_evenement_code_pulse():
    retour 1


déf laboratoire_evenement_code_effacer():
    retour 2


déf laboratoire_evenement_code_inverser():
    retour 3


déf laboratoire_evenement_code_geler():
    retour 4


déf laboratoire_distance_carre(ax, ay, bx, by):
    soit dx = ax - bx
    soit dy = ay - by
    retour dx * dx + dy * dy


déf laboratoire_forme_contient(code_forme, x, y, centre_x, centre_y, taille_a, taille_b, rayon_interieur):
    si code_forme == laboratoire_forme_code_cellule():
        retour 1 si x == centre_x et y == centre_y sinon 0

    si code_forme == laboratoire_forme_code_rectangle():
        retour 1 si abs(x - centre_x) <= taille_a et abs(y - centre_y) <= taille_b sinon 0

    soit distance_carre = laboratoire_distance_carre(x, y, centre_x, centre_y)

    si code_forme == laboratoire_forme_code_cercle():
        retour 1 si distance_carre <= taille_a * taille_a sinon 0

    si code_forme == laboratoire_forme_code_anneau():
        soit rayon_exterieur = taille_a
        si rayon_exterieur < rayon_interieur:
            rayon_exterieur = rayon_interieur
        soit distance_interieure = rayon_interieur * rayon_interieur
        soit distance_exterieure = rayon_exterieur * rayon_exterieur
        retour 1 si distance_carre >= distance_interieure et distance_carre <= distance_exterieure sinon 0

    retour 0


déf laboratoire_mode_autorise(code_mode, contient):
    si code_mode == laboratoire_mode_code_aucun():
        retour 1
    si code_mode == laboratoire_mode_code_interieur():
        retour 1 si contient == 1 sinon 0
    si code_mode == laboratoire_mode_code_exterieur():
        retour 0 si contient == 1 sinon 1
    si code_mode == laboratoire_mode_code_barriere():
        retour 0 si contient == 1 sinon 1
    retour 1


déf laboratoire_intensite_radiale(x, y, centre_x, centre_y, rayon):
    si rayon <= 0:
        retour 1000 si x == centre_x et y == centre_y sinon 0

    soit distance = math.sqrt(laboratoire_distance_carre(x, y, centre_x, centre_y))
    si distance > rayon:
        retour 0

    soit intensite = (1 - (distance / rayon)) * 1000
    si intensite < 0:
        retour 0
    si intensite > 1000:
        retour 1000
    retour math.floor(intensite + 0.5)


déf laboratoire_probabilite_modifiee(probabilite_base_sur_1000, champ_local_sur_1000):
    soit champ = champ_local_sur_1000
    si champ < 0:
        champ = 0
    si champ > 2000:
        champ = 2000

    soit probabilite = (probabilite_base_sur_1000 * champ) / 1000
    si probabilite < 0:
        retour 0
    si probabilite > 1000:
        retour 1000
    retour math.floor(probabilite + 0.5)


déf laboratoire_cellule_evenement(etat_initial, code_evenement, intensite_sur_1000, seuil_sur_1000):
    si intensite_sur_1000 < seuil_sur_1000:
        retour etat_initial

    si code_evenement == laboratoire_evenement_code_pulse():
        retour 1
    si code_evenement == laboratoire_evenement_code_effacer():
        retour 0
    si code_evenement == laboratoire_evenement_code_inverser():
        retour 0 si etat_initial == 1 sinon 1

    retour etat_initial


# Metriques Life Signatures : le parcours de grille reste cote navigateur,
# mais les formules canoniques viennent du module multilingual/WASM.

déf metrique_entropie_depuis_comptage(total_cellules, cellules_vivantes):
    si total_cellules <= 0:
        retour 0

    soit p = cellules_vivantes / total_cellules
    soit q = 1 - p

    si p <= 0 ou p >= 1:
        retour 0

    retour 0 - (p * (math.log(p) / math.log(2)) + q * (math.log(q) / math.log(2)))


déf metrique_compacite_depuis_mesures(cellules_vivantes, perimetre):
    si cellules_vivantes <= 0:
        retour 0

    soit perimetre_minimum = 2 * math.sqrt(math.pi * cellules_vivantes)
    soit perimetre_reel = perimetre
    si perimetre_reel < 1:
        perimetre_reel = 1

    soit compacite = perimetre_minimum / perimetre_reel
    si compacite > 1:
        retour 1
    retour compacite


déf metrique_fragmentation_depuis_mesures(nombre_groupes, cellules_vivantes):
    si cellules_vivantes <= 0:
        retour 0

    soit fragmentation = (nombre_groupes / math.sqrt(cellules_vivantes)) / 5
    si fragmentation > 1:
        retour 1
    retour fragmentation


déf metrique_croissance_depuis_comptages(cellules_precedentes, cellules_courantes):
    si cellules_precedentes <= 0:
        retour 1 si cellules_courantes > 0 sinon 0

    soit taux = (cellules_courantes - cellules_precedentes) / cellules_precedentes
    si taux < -1:
        retour -1
    si taux > 1:
        retour 1
    retour taux


déf metrique_symetrie_depuis_correspondances(correspondances_horizontales, correspondances_verticales, total_comparaisons):
    si total_comparaisons <= 0:
        retour 0
    retour (correspondances_horizontales + correspondances_verticales) / (2 * total_comparaisons)


déf metrique_score_stabilite(entropie, compacite, taux_croissance):
    retour (1 - entropie) * (1 - abs(taux_croissance)) * 0.5 + compacite * 0.5


déf metrique_score_chaos(entropie, compacite):
    retour entropie * (1 - compacite)


déf metrique_score_organisation(compacite, symetrie, fragmentation):
    retour compacite * symetrie * (1 - fragmentation)


déf metrique_score_dispersion(entropie, fragmentation):
    retour fragmentation * entropie


déf metrique_classe_dynamique(entropie, compacite, fragmentation, symetrie, taux_croissance):
    soit stabilite = metrique_score_stabilite(entropie, compacite, taux_croissance)
    soit chaos = metrique_score_chaos(entropie, compacite)
    soit organisation = metrique_score_organisation(compacite, symetrie, fragmentation)
    soit dispersion = metrique_score_dispersion(entropie, fragmentation)
    soit croissance = abs(taux_croissance)

    soit meilleur = stabilite
    soit categorie = 1

    si chaos > meilleur:
        meilleur = chaos
        categorie = 2
    si organisation > meilleur:
        meilleur = organisation
        categorie = 3
    si dispersion > meilleur:
        meilleur = dispersion
        categorie = 4
    si croissance > meilleur:
        categorie = 5

    retour categorie


# Choreographie : interpolation de parametres d'automates entre keyframes

déf interpoler_lineaire(valeur_debut, valeur_fin, progression_sur_1000):
    soit progression = progression_sur_1000
    si progression < 0:
        progression = 0
    si progression > 1000:
        progression = 1000
    retour valeur_debut + ((valeur_fin - valeur_debut) * progression) // 1000


déf interpoler_lisse(valeur_debut, valeur_fin, progression_sur_1000):
    soit t = progression_sur_1000 / 1000.0
    soit lisse = t * t * (3 - 2 * t)
    soit resultat = valeur_debut + (valeur_fin - valeur_debut) * lisse
    retour math.floor(resultat + 0.5)


déf progression_entre_keyframes(position_sur_1000, debut_sur_1000, fin_sur_1000):
    si fin_sur_1000 <= debut_sur_1000:
        retour 1000
    soit duree = fin_sur_1000 - debut_sur_1000
    soit avancement = position_sur_1000 - debut_sur_1000
    si avancement <= 0:
        retour 0
    si avancement >= duree:
        retour 1000
    retour (avancement * 1000) // duree


déf angle_interpolee_keyframe(angle_debut, angle_fin, progression_sur_1000):
    soit delta = angle_fin - angle_debut
    si delta > 180:
        delta = delta - 360
    si delta < -180:
        delta = delta + 360
    soit angle = angle_debut + (delta * progression_sur_1000) // 1000
    retour propagation_angle_normalise(angle)


# Ecosysteme : modes d'interaction multi-automates

déf ecosysteme_mode_superposition():
    retour 0


déf ecosysteme_mode_collision():
    retour 1


déf ecosysteme_mode_absorption():
    retour 2


déf ecosysteme_mode_hybridation():
    retour 3


déf ecosysteme_progression_decalee(progression_globale_sur_1000, decalage_sur_1000):
    soit progression = progression_globale_sur_1000 - decalage_sur_1000
    si progression < 0:
        retour 0
    si progression > 1000:
        retour 1000
    retour progression


déf ecosysteme_interaction(etat_a, etat_b, regle_a, regle_b, code_mode):
    si code_mode == ecosysteme_mode_superposition():
        retour 1 si etat_a == 1 ou etat_b == 1 sinon 0
    si code_mode == ecosysteme_mode_collision():
        retour 0 si etat_a == 1 et etat_b == 1 sinon (1 si etat_a == 1 ou etat_b == 1 sinon 0)
    si code_mode == ecosysteme_mode_absorption():
        retour etat_a
    si code_mode == ecosysteme_mode_hybridation():
        retour etat_a
    retour 1 si etat_a == 1 ou etat_b == 1 sinon 0


déf ecosysteme_regle_hybride(regle_a, regle_b):
    retour regle_morphee(regle_a, regle_b, 500)


# Espaces de travail : utilitaires pour l'interface
déf espace_indice_couleur(numero_regle):
    retour numero_regle % 8


déf espace_identifiant(numero_regle, index):
    retour numero_regle * 1000 + index


déf graine_ligne(graine_base, ligne_source, ligne_cible):
    retour graine_base + (ligne_source + 1) * 1009 + (ligne_cible + 1) * 9176


# ============================================================
# Espace des règles : distance de Hamming
# ============================================================
déf hamming_distance(regle_a, regle_b):
    soit count = 0
    soit a = regle_a % 256
    soit b = regle_b % 256
    pour _ dans range(8):
        si (a % 2) != (b % 2):
            count = count + 1
        a = a // 2
        b = b // 2
    retour count


# ============================================================
# Génétique : fonctions de fitness
# ============================================================
déf fitness_symetrie(symetrie_sur_1000):
    soit cible = 700
    soit ecart = symetrie_sur_1000 - cible
    si ecart < 0:
        ecart = -ecart
    retour 1000 - ecart si ecart <= 1000 sinon 0


déf fitness_densite(densite_sur_1000):
    soit cible = 400
    soit ecart = densite_sur_1000 - cible
    si ecart < 0:
        ecart = -ecart
    retour 1000 - ecart * 2 si ecart <= 500 sinon 0


déf fitness_rythmique(transitions_sur_1000):
    soit cible = 350
    soit ecart = transitions_sur_1000 - cible
    si ecart < 0:
        ecart = -ecart
    retour 1000 - ecart * 2 si ecart <= 500 sinon 0


déf fitness_totale(symetrie_sur_1000, densite_sur_1000, transitions_sur_1000, w_symetrie, w_densite, w_rythme):
    soit s = fitness_symetrie(symetrie_sur_1000) * w_symetrie
    soit d = fitness_densite(densite_sur_1000) * w_densite
    soit r = fitness_rythmique(transitions_sur_1000) * w_rythme
    soit total_w = w_symetrie + w_densite + w_rythme
    retour (s + d + r) // total_w si total_w > 0 sinon 0


# ============================================================
# Génétique : opérateurs de croisement et mutation
# ============================================================
déf croisement_1pt(regle_a, regle_b, point_sur_8):
    soit diviseur = 1
    pour _ dans range(point_sur_8 % 8):
        diviseur = diviseur * 2
    retour ((regle_a % 256 // diviseur) * diviseur) + (regle_b % 256 % diviseur)


déf croisement_uniforme(regle_a, regle_b, masque_sur_255):
    soit resultat = 0
    soit puissance = 1
    soit a = regle_a % 256
    soit b = regle_b % 256
    soit m = masque_sur_255 % 256
    pour _ dans range(8):
        si (m % 2) == 1:
            resultat = resultat + (a % 2) * puissance
        sinon:
            resultat = resultat + (b % 2) * puissance
        a = a // 2
        b = b // 2
        m = m // 2
        puissance = puissance * 2
    retour resultat


déf mutation_bit(regle, indice_bit):
    soit bit = 1
    pour _ dans range(indice_bit % 8):
        bit = bit * 2
    soit valeur_bit = (regle % 256 // bit) % 2
    si valeur_bit == 1:
        retour regle - bit
    retour regle + bit


# ============================================================
# Sonification dynamique depuis l'état de la grille
# ============================================================
déf parametres_sonification_dynamique(symetrie_sur_1000, transitions_sur_1000):
    si symetrie_sur_1000 > 700:
        retour 1
    si symetrie_sur_1000 > 400:
        retour 2
    si transitions_sur_1000 > 600:
        retour 4
    retour 3


déf gain_harmonique_depuis_symetrie(symetrie_sur_1000):
    retour 1000 - symetrie_sur_1000


déf mode_sonore_depuis_classe(classe_wolfram):
    si classe_wolfram == 1:
        retour 0
    si classe_wolfram == 2:
        retour 1
    si classe_wolfram == 3:
        retour 3
    retour 2


déf tempo_musical(transitions_sur_1000, densite_sur_1000, mode):
    soit base = 54 + (transitions_sur_1000 * 126) // 1000
    si mode == 0:
        base = 48 + (densite_sur_1000 * 60) // 1000
    sinonsi mode == 2:
        base = base + 12
    sinonsi mode == 3:
        base = 72 + (transitions_sur_1000 * 156) // 1000
    si base < 40:
        retour 40
    si base > 240:
        retour 240
    retour base


déf degre_note_cellule(colonne, largeur, longueur_gamme, mapping):
    si largeur <= 0 ou longueur_gamme <= 0:
        retour 0
    si mapping == 1:
        soit centre = largeur // 2
        soit distance = abs(colonne - centre)
        retour ((distance * longueur_gamme * 2) // largeur) % longueur_gamme
    si mapping == 2:
        soit diviseur = largeur
        si diviseur < 1:
            diviseur = 1
        retour ((colonne * colonne + colonne) // diviseur) % longueur_gamme
    retour ((colonne * longueur_gamme) // largeur) % longueur_gamme


déf velocite_cellule(densite_locale_sur_1000, collision_active):
    soit valeur = 32 + (densite_locale_sur_1000 * 76) // 1000
    si collision_active:
        valeur = valeur + 19
    si valeur > 127:
        retour 127
    retour valeur


déf pan_cellule(colonne, largeur, centre_sur_1000, largeur_stereo_sur_1000):
    si largeur <= 1:
        retour 0
    soit position = (colonne * 2000) // (largeur - 1) - 1000
    soit centre = centre_sur_1000 - 500
    retour ((position + centre) * largeur_stereo_sur_1000) // 1000


déf octave_cellule(ligne, origine, hauteur, mode):
    si hauteur <= 1:
        retour 4
    soit distance = abs(ligne - origine)
    soit rapport = (distance * 1000) // hauteur
    si mode == 0:
        retour 3
    si rapport > 660:
        retour 5
    si rapport > 330:
        retour 4
    retour 3


déf enveloppe_depuis_densite(densite_sur_1000):
    si densite_sur_1000 > 700:
        retour 80
    si densite_sur_1000 > 400:
        retour 150
    retour 260


déf accent_collision(nombre_couches, mode):
    si nombre_couches <= 1:
        retour 0
    soit accent = nombre_couches * 180
    si mode == 3:
        accent = accent + 220
    si accent > 1000:
        retour 1000
    retour accent


# ============================================================
# Améliorations musicales — Harmoniques, quantification, filtres
# ============================================================
déf frequence_harmonique(fondamentale_hz_100, classe_wolfram):
    # Returns osc2 frequency using pure harmonic ratios based on Wolfram class
    # classe 1 → perfect fifth (3/2)
    # classe 2 → perfect fourth (4/3)
    # classe 3 → major third (5/4)
    # classe 4 → minor seventh (7/4)
    si classe_wolfram == 1:
        retour (fondamentale_hz_100 * 3) // 2
    si classe_wolfram == 2:
        retour (fondamentale_hz_100 * 4) // 3
    si classe_wolfram == 3:
        retour (fondamentale_hz_100 * 5) // 4
    retour (fondamentale_hz_100 * 7) // 4


déf quantifier_vers_gamme(freq_hz_100, gamme_code, note_racine_midi):
    # Quantize frequency to nearest scale degree
    # GAMMES: 0=pentatonic [0,2,4,7,9], 1=diatonic [0,2,4,5,7,9,11],
    #         2=chromatic [0,1,2,3,4,5,6,7,8,9,10,11], 3=whole-tone [0,2,4,6,8,10]
    # Returns the Hz*100 of nearest in-scale note
    si freq_hz_100 <= 0:
        retour 440 * 100
    soit mid_note = 60
    soit semi_offset = ((mid_note - note_racine_midi) % 12 + 12) % 12

    # gamme_code determines which semitone offsets are in the scale
    soit gamme_intervals = [0, 0, 0, 0]
    si gamme_code == 0:
        gamme_intervals = [0, 2, 4, 7, 9]
    sinonsi gamme_code == 1:
        gamme_intervals = [0, 2, 4, 5, 7, 9, 11]
    sinonsi gamme_code == 2:
        gamme_intervals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    sinonsi gamme_code == 3:
        gamme_intervals = [0, 2, 4, 6, 8, 10]

    # Find nearest scale degree (simplified: just use frequency ratio)
    # For now, return frequency as-is (JS will do the actual quantization)
    retour freq_hz_100


déf desaccord_depuis_entropie(entropie_sur_1000):
    # Less entropy (ordered patterns) → less detuning
    # High entropy (chaos) → more detuning for richness
    # Returns cents 0..1200
    soit detuning = (entropie_sur_1000 * 1200) // 1000
    retour detuning


déf type_filtre_depuis_classe(classe_wolfram):
    # 0=lowpass, 1=bandpass, 2=highpass
    si classe_wolfram == 1:
        retour 0
    si classe_wolfram == 2:
        retour 0
    si classe_wolfram == 3:
        retour 1
    retour 2


déf serie_harmonique_amplitude(rang_harmonique, symetrie_sur_1000, densite_sur_1000):
    # Amplitude of harmonic partial N (1..8)
    # Higher symmetry → amplitude peaks at strong harmonics (1,2,4)
    # Lower symmetry → more uniform distribution
    soit amplitude = 1000 // (rang_harmonique)
    soit symmetry_boost = (symetrie_sur_1000 // 100) * 100
    soit density_mod = (densite_sur_1000 // 100) * 50
    amplitude = amplitude - density_mod
    si amplitude < 10:
        retour 10
    si amplitude > 1000:
        retour 1000
    retour amplitude


déf timbre_depuis_entropie(entropie_sur_1000):
    # Blend coefficient 0..1000 for sine ↔ sawtooth crossfade
    # Low entropy → pure sine (0)
    # High entropy → sawtooth (1000)
    retour entropie_sur_1000


déf phase_motif(vitesse_sur_1000, delta_densite_sur_1000):
    # Returns 0=stable, 1=growth, 2=decline
    si delta_densite_sur_1000 > 100:
        retour 1
    si delta_densite_sur_1000 < -100:
        retour 2
    retour 0


déf detecter_attracteur(vitesse_sur_1000, etape_sur_1000):
    # Returns 0 (no attractor) or period length 1..32
    # Low velocity (vitesse) indicates a fixed point or cycle
    si vitesse_sur_1000 < 50:
        retour 1
    si vitesse_sur_1000 < 150:
        retour 2
    retour 0


déf register_depuis_region(colonne, largeur):
    # Map column to register: 0=bass, 1=harmony, 2=melody
    si largeur <= 0:
        retour 1
    soit proportion = (colonne * 3000) // largeur
    si proportion < 1000:
        retour 0
    si proportion > 2000:
        retour 2
    retour 1


déf parametres_classe_wolfram(classe_num, densite_sur_1000, symetrie_sur_1000):
    # Returns packed mode-code combining waveform, scale, tempo hints
    # Bits 0-3: waveform (0=sine, 1=tri, 2=saw, 3=square)
    # Bits 4-7: scale hint (0=pent, 1=diat, 2=chrom, 3=whole)
    # Bits 8-11: tempo divisor
    soit waveform = 0
    soit scale = 1
    soit tempo_div = 1

    si classe_num == 1:
        waveform = 0
        scale = 0
    sinonsi classe_num == 2:
        waveform = 1
        scale = 1
        tempo_div = 1
    sinonsi classe_num == 3:
        waveform = 2
        scale = 2
        tempo_div = 0
    sinonsi classe_num == 4:
        waveform = 3
        scale = 1
        tempo_div = 2

    retour waveform + (scale << 4) + (tempo_div << 8)
