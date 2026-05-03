function core() {
  return window.AutomaginariumCore;
}

export function populationInitiale(configBase, taille, graine) {
  return core().populationInitiale(configBase, taille, graine);
}

export function nouvelleGeneration(population, scores, tauxMutationSur1000, graine) {
  return core().nouvelleGeneration(population, scores, tauxMutationSur1000, graine);
}

export function evaluerPopulation(population, poidsObj) {
  return core().evaluerPopulation(population, poidsObj);
}

export function presetPoidsGenetique(nom) {
  return core().presetPoidsGenetique(nom);
}
