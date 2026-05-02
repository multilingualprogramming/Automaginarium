/*
 * Rule generation utilities for Automaginarium.
 *
 * These functions generate transition tables based on different rule modes.
 * They are TEMPORARY and will eventually be replaced by compiled ML functions.
 * See src/automate_universel.ml for the canonical implementations:
 *   - table_aleatoire()
 *   - table_symetrique()
 *   - table_totalistique()
 *
 * DO NOT ADD NEW LOGIC HERE. Update src/automate_universel.ml instead.
 */

function randomOutput(config) {
  return Array.from(
    { length: config.nombre_canaux_sortie },
    () => config.alphabet_sortie[Math.floor(Math.random() * config.alphabet_sortie.length)],
  );
}

export function generateRandomTable(config) {
  const allKeys = window.AutomaginariumCore.toutesClesVoisinage(config.alphabet_entree, config.taille_voisinage);
  return Object.fromEntries(allKeys.map((key) => [key, randomOutput(config)]));
}

export function generateSymmetricTable(config) {
  const table = {};
  const allKeys = window.AutomaginariumCore.toutesClesVoisinage(config.alphabet_entree, config.taille_voisinage);
  allKeys.forEach((key) => {
    const neighborhoodArray = JSON.parse(key);
    const mirror = JSON.stringify(neighborhoodArray.slice().reverse());
    if (table[key]) return;
    const output = randomOutput(config);
    table[key] = output;
    table[mirror] = output;
  });
  return table;
}

export function generateTotalisticTable(config) {
  const allKeys = window.AutomaginariumCore.toutesClesVoisinage(config.alphabet_entree, config.taille_voisinage);
  return Object.fromEntries(allKeys.map((key) => {
    const neighborhoodArray = JSON.parse(key);
    const sum = neighborhoodArray.reduce((acc, value) => acc + Number(value), 0);
    const index = Number.isFinite(sum) ? Math.abs(sum) % config.alphabet_sortie.length : key.length % config.alphabet_sortie.length;
    return [key, Array.from(
      { length: config.nombre_canaux_sortie },
      (_, channel) => config.alphabet_sortie[(index + channel) % config.alphabet_sortie.length],
    )];
  }));
}
