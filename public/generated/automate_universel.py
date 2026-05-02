import json
import random
def normaliser_configuration(configuration):
    alphabet_entree = configuration.get('alphabet_entree', [0, 1])
    alphabet_sortie = configuration.get('alphabet_sortie', alphabet_entree)
    taille_voisinage = int(configuration.get('taille_voisinage', 3))
    nombre_canaux_sortie = int(configuration.get('nombre_canaux_sortie', 1))
    mode_regle = configuration.get('mode_regle', 'table')
    largeur = int(configuration.get('largeur', 161))
    hauteur = int(configuration.get('hauteur', 100))
    if (taille_voisinage < 1):
        taille_voisinage = 1
    if ((taille_voisinage % 2) == 0):
        taille_voisinage = (taille_voisinage + 1)
    if (nombre_canaux_sortie < 1):
        nombre_canaux_sortie = 1
    return {'nom': configuration.get('nom', 'Univers sans nom'), 'alphabet_entree': alphabet_entree, 'alphabet_sortie': alphabet_sortie, 'taille_voisinage': taille_voisinage, 'nombre_canaux_sortie': nombre_canaux_sortie, 'mode_regle': mode_regle, 'table_transition': configuration.get('table_transition', {}), 'frontiere': configuration.get('frontiere', 'fixe'), 'valeur_frontiere': configuration.get('valeur_frontiere', alphabet_entree[0]), 'largeur': largeur, 'hauteur': hauteur, 'etat_initial': configuration.get('etat_initial', {'mode': 'centre'}), 'rendu': configuration.get('rendu', {})}
def cle_voisinage(voisinage):
    return json.dumps(voisinage).replace(', ', ',')
def ancienne_cle_voisinage(voisinage):
    return ''.join([str(valeur) for valeur in voisinage])
def toutes_cles_voisinage(alphabet, taille):
    cles = []
    def visiter(prefixe, profondeur):
        if (profondeur == taille):
            cles.append(cle_voisinage(prefixe))
            return
        for symbole in alphabet:
            suivant = list(prefixe)
            suivant.append(symbole)
            visiter(suivant, (profondeur + 1))
    visiter([], 0)
    return cles
def sortie_defaut(configuration):
    alphabet_sortie = configuration['alphabet_sortie']
    valeur = (alphabet_sortie[0] if (len(alphabet_sortie) > 0) else 0)
    return [valeur for _ in range(configuration['nombre_canaux_sortie'])]
def lire_cellule(ligne, indice, configuration):
    largeur = len(ligne)
    if (0 <= indice < largeur):
        return ligne[indice]
    if ((configuration.get('frontiere', 'fixe') == 'circulaire') and (largeur > 0)):
        return ligne[(indice % largeur)]
    return configuration.get('valeur_frontiere', 0)
def voisinage_cellule(ligne, indice, configuration):
    taille = configuration['taille_voisinage']
    rayon = (taille // 2)
    return [lire_cellule(ligne, (indice + decalage), configuration) for decalage in range((0 - rayon), (rayon + 1))]
def transition_table(voisinage, configuration):
    table = configuration.get('table_transition', {})
    cle = cle_voisinage(voisinage)
    ancienne_cle = ancienne_cle_voisinage(voisinage)
    sortie = table.get(cle, table.get(ancienne_cle, sortie_defaut(configuration)))
    if (not isinstance(sortie, list)):
        sortie = [sortie]
    if (len(sortie) < configuration['nombre_canaux_sortie']):
        premiere = (sortie[0] if (len(sortie) > 0) else configuration['alphabet_sortie'][0])
        for canal_manquant in range((configuration['nombre_canaux_sortie'] - len(sortie))):
            sortie.append(premiere)
    return sortie
def transition_totalistique(voisinage, configuration):
    somme = 0
    for valeur in voisinage:
        somme = (somme + int(valeur))
    alphabet = configuration['alphabet_sortie']
    sortie = []
    for canal in range(configuration['nombre_canaux_sortie']):
        sortie.append(alphabet[((somme + canal) % len(alphabet))])
    return sortie
def table_wolfram(numero_regle):
    table = {}
    for motif in range(8):
        gauche = ((motif // 4) % 2)
        centre = ((motif // 2) % 2)
        droite = (motif % 2)
        table[cle_voisinage([gauche, centre, droite])] = [((numero_regle // (2 ** motif)) % 2)]
    return table
def table_totalistique(configuration):
    config = normaliser_configuration(configuration)
    table = {}
    cles = toutes_cles_voisinage(config['alphabet_entree'], config['taille_voisinage'])
    for cle in cles:
        voisinage = json.loads(cle)
        table[cle] = transition_totalistique(voisinage, config)
    return table
def sortie_aleatoire(configuration, generateur):
    sortie = []
    for canal in range(configuration['nombre_canaux_sortie']):
        sortie.append(generateur.choice(configuration['alphabet_sortie']))
    return sortie
def table_aleatoire(configuration, graine=42):
    config = normaliser_configuration(configuration)
    generateur = random.Random(graine)
    table = {}
    cles = toutes_cles_voisinage(config['alphabet_entree'], config['taille_voisinage'])
    for cle in cles:
        table[cle] = sortie_aleatoire(config, generateur)
    return table
def table_symetrique(configuration, graine=42):
    config = normaliser_configuration(configuration)
    generateur = random.Random(graine)
    table = {}
    cles = toutes_cles_voisinage(config['alphabet_entree'], config['taille_voisinage'])
    for cle in cles:
        if (cle in table):
            continue
        voisinage = json.loads(cle)
        miroir = list(reversed(voisinage))
        cle_miroir = cle_voisinage(miroir)
        sortie = sortie_aleatoire(config, generateur)
        table[cle] = sortie
        table[cle_miroir] = sortie
    return table
def valider_configuration(configuration):
    config = normaliser_configuration(configuration)
    erreurs = []
    avertissements = []
    if (len(config['alphabet_entree']) == 0):
        erreurs.append('alphabet_entree vide')
    if (len(config['alphabet_sortie']) == 0):
        erreurs.append('alphabet_sortie vide')
    if ((config['taille_voisinage'] < 1) or ((config['taille_voisinage'] % 2) == 0)):
        erreurs.append('taille_voisinage doit etre impair et positif')
    if (config['nombre_canaux_sortie'] < 1):
        erreurs.append('nombre_canaux_sortie doit etre positif')
    if (config['mode_regle'] not in ['table', 'totalistique', 'aleatoire']):
        erreurs.append('mode_regle inconnu')
    if (config['mode_regle'] == 'table'):
        cles = toutes_cles_voisinage(config['alphabet_entree'], config['taille_voisinage'])
        for cle in cles:
            if (cle not in config['table_transition']):
                avertissements.append(('transition absente ' + cle))
    return {'valide': (len(erreurs) == 0), 'erreurs': erreurs, 'avertissements': avertissements}
def transition_aleatoire(voisinage, configuration, generateur):
    alphabet = configuration['alphabet_sortie']
    return [generateur.choice(alphabet) for _ in range(configuration['nombre_canaux_sortie'])]
def appliquer_regle(voisinage, configuration, generateur):
    mode = configuration.get('mode_regle', 'table')
    if (mode == 'totalistique'):
        return transition_totalistique(voisinage, configuration)
    if (mode == 'aleatoire'):
        return transition_aleatoire(voisinage, configuration, generateur)
    return transition_table(voisinage, configuration)
def valeur_principale(sortie):
    return (sortie[0] if (len(sortie) > 0) else 0)
def prochaine_generation(generation, configuration, graine=0):
    generateur = random.Random(graine)
    suivante = []
    for indice in range(len(generation)):
        voisinage = voisinage_cellule(generation, indice, configuration)
        sortie = appliquer_regle(voisinage, configuration, generateur)
        suivante.append(valeur_principale(sortie))
    return suivante
def creer_generation_initiale(configuration):
    largeur = configuration['largeur']
    alphabet = configuration['alphabet_entree']
    vide = alphabet[0]
    vivant = (alphabet[1] if (len(alphabet) > 1) else alphabet[0])
    generation = [vide for _ in range(largeur)]
    etat_initial = configuration.get('etat_initial', {'mode': 'centre'})
    mode = etat_initial.get('mode', 'centre')
    if (mode == 'aleatoire'):
        generateur = random.Random(etat_initial.get('graine', 42))
        probabilite = etat_initial.get('probabilite', 0.28)
        return [(generateur.choice(alphabet) if (generateur.random() < probabilite) else vide) for _ in range(largeur)]
    if (mode == 'motif'):
        motif = etat_initial.get('valeurs', [])
        debut = max(0, ((largeur - len(motif)) // 2))
        for indice_motif in range(len(motif)):
            if ((debut + indice_motif) < largeur):
                generation[(debut + indice_motif)] = motif[indice_motif]
        return generation
    generation[(largeur // 2)] = vivant
    return generation
def generer_univers(configuration_brute):
    configuration = normaliser_configuration(configuration_brute)
    lignes = []
    lignes.append(creer_generation_initiale(configuration))
    for rang in range(1, configuration['hauteur']):
        lignes.append(prochaine_generation(lignes[(rang - 1)], configuration, rang))
    return lignes
def charger_configuration(chemin):
    with open(chemin, 'r', encoding='utf-8') as fichier:
        return normaliser_configuration(json.load(fichier))
def prochaine_generation_detaillee(generation, configuration, graine=0):
    generateur = random.Random(graine)
    suivante = []
    sorties = []
    for indice in range(len(generation)):
        voisinage = voisinage_cellule(generation, indice, configuration)
        sortie = appliquer_regle(voisinage, configuration, generateur)
        sorties.append(sortie)
        suivante.append(valeur_principale(sortie))
    return {'generation': suivante, 'sorties': sorties}
def generer_univers_detaille(configuration_brute):
    configuration = normaliser_configuration(configuration_brute)
    lignes = []
    sorties = []
    lignes.append(creer_generation_initiale(configuration))
    sorties.append([[valeur] for valeur in lignes[0]])
    for rang in range(1, configuration['hauteur']):
        detail = prochaine_generation_detaillee(lignes[(rang - 1)], configuration, rang)
        lignes.append(detail['generation'])
        sorties.append(detail['sorties'])
    return {'configuration': configuration, 'lignes': lignes, 'sorties': sorties}

