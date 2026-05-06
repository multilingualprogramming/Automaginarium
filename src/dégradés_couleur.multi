importer json

# Dégradés et interpolation de couleurs pour Automaginarium
# Module de calcul mathématique pour interpoler les couleurs entre états.
# Les méthodes d'interpolation s'adaptent au nombre d'états de l'alphabet.

def analyser_couleur_hex(hex_string):
    soit texte = str(hex_string).strip()
    si texte.startswith("#"):
        texte = texte[1:]
    si len(texte) != 6:
        retour {"r": 100, "g": 100, "b": 100}
    essayer:
        soit r = int(texte[0:2], 16)
        soit g = int(texte[2:4], 16)
        soit b = int(texte[4:6], 16)
        retour {"r": r, "g": g, "b": b}
    sauf:
        retour {"r": 100, "g": 100, "b": 100}


def couleur_en_hex(couleur):
    soit r = max(0, min(255, int(couleur.get("r", 0))))
    soit g = max(0, min(255, int(couleur.get("g", 0))))
    soit b = max(0, min(255, int(couleur.get("b", 0))))
    retour "#" + format(r, "02x") + format(g, "02x") + format(b, "02x")


def interpoler_lineaire(t, couleur1, couleur2):
    # Lerp: interpolation linéaire pour 2 états
    # t: paramètre [0, 1], 0 = couleur1, 1 = couleur2
    soit c1 = analyser_couleur_hex(couleur1)
    soit c2 = analyser_couleur_hex(couleur2)
    soit t_clamped = max(0, min(1, t))
    retour {
        "r": c1["r"] + (c2["r"] - c1["r"]) * t_clamped,
        "g": c1["g"] + (c2["g"] - c1["g"]) * t_clamped,
        "b": c1["b"] + (c2["b"] - c1["b"]) * t_clamped,
    }


def interpoler_bilineaire(u, v, couleur1, couleur2, couleur3, couleur4):
    # Bilinear pour 4 états (coin inférieur-gauche, bas-droit, haut-droit, haut-gauche)
    # u, v: paramètres [0, 1] pour axes x et y
    soit u_clamped = max(0, min(1, u))
    soit v_clamped = max(0, min(1, v))

    soit c1 = analyser_couleur_hex(couleur1)
    soit c2 = analyser_couleur_hex(couleur2)
    soit c3 = analyser_couleur_hex(couleur3)
    soit c4 = analyser_couleur_hex(couleur4)

    # Interpoler d'abord selon u sur les deux rangées
    soit bas = {
        "r": c1["r"] + (c2["r"] - c1["r"]) * u_clamped,
        "g": c1["g"] + (c2["g"] - c1["g"]) * u_clamped,
        "b": c1["b"] + (c2["b"] - c1["b"]) * u_clamped,
    }
    soit haut = {
        "r": c4["r"] + (c3["r"] - c4["r"]) * u_clamped,
        "g": c4["g"] + (c3["g"] - c4["g"]) * u_clamped,
        "b": c4["b"] + (c3["b"] - c4["b"]) * u_clamped,
    }

    # Puis interpoler selon v entre les deux résultats
    retour {
        "r": bas["r"] + (haut["r"] - bas["r"]) * v_clamped,
        "g": bas["g"] + (haut["g"] - bas["g"]) * v_clamped,
        "b": bas["b"] + (haut["b"] - bas["b"]) * v_clamped,
    }


def coordonnees_barycentriques(lambda1, lambda2, lambda3, couleur1, couleur2, couleur3):
    # Barycentric pour 3 états (triangle coloré)
    # lambda1, lambda2, lambda3 doivent sommer à ~1.0
    soit c1 = analyser_couleur_hex(couleur1)
    soit c2 = analyser_couleur_hex(couleur2)
    soit c3 = analyser_couleur_hex(couleur3)

    soit l1 = max(0, min(1, lambda1))
    soit l2 = max(0, min(1, lambda2))
    soit l3 = max(0, min(1, lambda3))

    soit somme = l1 + l2 + l3
    si somme > 0:
        soit l1_norm = l1 / somme
        soit l2_norm = l2 / somme
        soit l3_norm = l3 / somme
    sinon:
        soit l1_norm = 1/3
        soit l2_norm = 1/3
        soit l3_norm = 1/3

    retour {
        "r": c1["r"] * l1_norm + c2["r"] * l2_norm + c3["r"] * l3_norm,
        "g": c1["g"] * l1_norm + c2["g"] * l2_norm + c3["g"] * l3_norm,
        "b": c1["b"] * l1_norm + c2["b"] * l2_norm + c3["b"] * l3_norm,
    }


def distance(point, ancre):
    # Calcule la distance Euclidienne en espace coloré RGB
    soit d = (point["r"] - ancre["r"]) ** 2 + (point["g"] - ancre["g"]) ** 2 + (point["b"] - ancre["b"]) ** 2
    retour d ** 0.5


def ponderee_distance_inverse(point_index, nombre_etats, ancres_couleurs):
    # IDW pour 5+ états: pondération par distance inverse
    # ancres_couleurs: liste de couleurs hex correspondant à chaque état
    si nombre_etats < 2:
        retour analyser_couleur_hex(ancres_couleurs[0] si ancres_couleurs sinon "#000000")

    soit points_normes = []
    pour i dans intervalle(nombre_etats):
        # Map état i à [0, 1] linéairement
        soit position_normalisee = i / (nombre_etats - 1) si nombre_etats > 1 sinon 0.5
        points_normes.append(position_normalisee)

    soit poids = []
    soit position_requete = point_index / (nombre_etats - 1) si nombre_etats > 1 sinon 0.5

    pour i dans intervalle(nombre_etats):
        soit diff = abs(position_requete - points_normes[i])
        si diff < 0.001:
            # Point est presque exactement un ancre
            retour analyser_couleur_hex(ancres_couleurs[i])
        soit poids_i = 1 / (diff ** 2)
        poids.append(poids_i)

    soit somme_poids = sum(poids)
    si somme_poids == 0:
        retour analyser_couleur_hex(ancres_couleurs[0])

    soit r_interpole = sum([analyser_couleur_hex(ancres_couleurs[i])["r"] * poids[i] pour i dans intervalle(nombre_etats)]) / somme_poids
    soit g_interpole = sum([analyser_couleur_hex(ancres_couleurs[i])["g"] * poids[i] pour i dans intervalle(nombre_etats)]) / somme_poids
    soit b_interpole = sum([analyser_couleur_hex(ancres_couleurs[i])["b"] * poids[i] pour i dans intervalle(nombre_etats)]) / somme_poids

    retour {"r": r_interpole, "g": g_interpole, "b": b_interpole}


def couleur_pour_etat_gradient(etat, config_gradient):
    # Interface principale pour obtenir la couleur d'un état en mode gradient
    # config_gradient: {"mode": "gradient", "methode": "lineaire|barycentric|bilinear|idw", "ancres": {...}}

    soit mode = config_gradient.get("mode", "discret")
    si mode == "discret":
        # Tomber au mode discret: utiliser la palette directe
        soit palette = config_gradient.get("palette", {})
        retour palette.get(str(etat), "#808080")

    soit methode = config_gradient.get("methode", "lineaire")
    soit ancres = config_gradient.get("ancres", {})
    soit nombre_etats = config_gradient.get("nombre_etats", 2)

    si methode == "lineaire" et nombre_etats >= 2:
        soit c0 = ancres.get("0", "#0066ff")
        soit c1 = ancres.get("1", "#ff6b35")
        soit t = etat / max(1, nombre_etats - 1)
        retour couleur_en_hex(interpoler_lineaire(t, c0, c1))

    sinon si methode == "barycentric" et nombre_etats >= 3:
        soit c0 = ancres.get("0", "#0066ff")
        soit c1 = ancres.get("1", "#00ff41")
        soit c2 = ancres.get("2", "#ff6b35")
        # Utiliser coordonnées barycentriques basées sur la position de l'état
        soit lambda0 = max(0, 1 - (etat / nombre_etats))
        soit lambda1 = (etat / nombre_etats) si etat < nombre_etats / 2 sinon (1 - etat / nombre_etats)
        soit lambda2 = etat / nombre_etats
        soit resultat = coordonnees_barycentriques(lambda0, lambda1, lambda2, c0, c1, c2)
        retour couleur_en_hex(resultat)

    sinon si methode == "bilinear" et nombre_etats >= 4:
        soit c0 = ancres.get("0", "#0066ff")
        soit c1 = ancres.get("1", "#00aaff")
        soit c2 = ancres.get("2", "#00ff41")
        soit c3 = ancres.get("3", "#ff6b35")
        soit u = (etat % 2) / 1.0
        soit v = (etat // 2) / max(1, (nombre_etats - 1) // 2)
        soit resultat = interpoler_bilineaire(u, v, c0, c1, c2, c3)
        retour couleur_en_hex(resultat)

    sinon si methode == "idw":
        soit ancres_liste = [ancres.get(str(i), "#888888") pour i dans intervalle(nombre_etats)]
        soit resultat = ponderee_distance_inverse(etat, nombre_etats, ancres_liste)
        retour couleur_en_hex(resultat)

    # Fallback
    retour ancres.get(str(etat), "#808080")


def valider_gradient(config_gradient):
    # Valide une configuration de gradient
    soit erreurs = []
    soit avertissements = []

    soit mode = config_gradient.get("mode", "discret")
    si mode non dans ["discret", "gradient"]:
        erreurs.append("mode_rendu doit être 'discret' ou 'gradient'")

    si mode == "gradient":
        soit methode = config_gradient.get("methode", "")
        si methode non dans ["lineaire", "barycentric", "bilinear", "idw"]:
            erreurs.append("Méthode inconnue: " + str(methode))

        soit nombre_etats = config_gradient.get("nombre_etats", 2)
        si nombre_etats < 2:
            erreurs.append("Au minimum 2 états nécessaires pour gradient")

        si methode == "barycentric" et nombre_etats < 3:
            avertissements.append("Barycentric demande 3+ états, fallback Lerp")

        si methode == "bilinear" et nombre_etats < 4:
            avertissements.append("Bilinear demande 4+ états, fallback IDW")

    retour {"valide": len(erreurs) == 0, "erreurs": erreurs, "avertissements": avertissements}
