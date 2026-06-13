const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "automaginarium-browser-module-"));
const outFile = path.join(outDir, "browser_module.mjs");
const exportsList = [
  "resumer_univers_vivant",
  "construire_univers_vivant",
  "source_univers_vivant",
  "resumer_configuration",
  "resumer_transition",
  "decrire_configuration",
  "signaux_transition",
  "table_wolfram",
  "table_aleatoire",
  "table_symetrique",
  "table_totalistique",
  "assurer_configuration_rendable",
  "construire_configuration_regle_generee",
  "etat_formulaire_vers_configuration",
  "configuration_vers_etat_formulaire",
  "valider_configuration",
  "etiquette_espace_regles",
  "etiquette_regle_hud",
  "generer_univers_detaille",
  "population_initiale",
  "nouvelle_generation",
  "preset_poids_genetique",
  "evaluer_population",
  "appliquer_perturbation",
].join(",");

function runBuild() {
  const localMultilingual = path.join(root, "..", "multilingual");
  const pythonPath = [process.env.PYTHONPATH, localMultilingual].filter(Boolean).join(path.delimiter);
  const env = {
    ...process.env,
    PYTHONPATH: pythonPath,
  };
  const result = spawnSync(
    "python3",
    [
      "-m",
      "multilingualprogramming",
      "build-browser-module",
      "--lang",
      "fr",
      "src/automate_universel.multi",
      "--export",
      exportsList,
      "--out",
      outFile,
    ],
    {
      cwd: root,
      env,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert(fs.existsSync(outFile));
}

async function testGeneratedModule() {
  const module = await import(pathToFileURL(outFile).href);
  const config = {
    nom: "Module genere",
    alphabet_entree: [0, 1],
    alphabet_sortie: [0, 1],
    taille_voisinage: 3,
    nombre_canaux_sortie: 1,
    mode_regle: "table",
    table_transition: module.table_wolfram(90),
    largeur: 9,
    hauteur: 6,
    frontiere: "circulaire",
    etat_initial: { mode: "centre" },
    rendu: { taille_cellule: 4 },
  };

  assert.equal(module.resumer_univers_vivant(config).profile, "automaginarium-1d-ca-v1");
  assert.equal(module.construire_univers_vivant(config).kind, "semantic-core-v1");
  assert.deepEqual(module.table_wolfram(90)["[1,1,0]"], [1]);
  assert.equal(Object.keys(module.table_aleatoire(config, 17)).length, 8);
  assert.deepEqual(
    module.table_symetrique(config, 17)["[0,1,1]"],
    module.table_symetrique(config, 17)["[1,1,0]"],
  );
  assert.equal(module.signaux_transition(config, 2).length, 2);
  assert.equal(module.generer_univers_detaille(config).lignes.length, 6);
  const multiChannel = {
    ...config,
    alphabet_sortie: [0, 1, 2],
    nombre_canaux_sortie: 2,
    mode_regle: "totalistique",
    table_transition: module.table_totalistique({
      ...config,
      alphabet_sortie: [0, 1, 2],
      nombre_canaux_sortie: 2,
    }),
  };
  assert.equal(module.generer_univers_detaille(multiChannel).sorties[0][0].length, 2);
  assert.equal(module.valider_configuration(config).valide, true);
  assert(module.etiquette_espace_regles(config).includes("regles possibles"));
  assert.equal(module.population_initiale(config, 3, 11).length, 3);
  assert.equal(module.nouvelle_generation([config, config], [0.1, 0.9], 50, 11).length, 2);
  assert.equal(module.preset_poids_genetique("stable").stabilite, 9);
  const evaluated = module.evaluer_population([config], module.preset_poids_genetique("beau"));
  assert.equal(evaluated.length, 1);
  assert.equal(evaluated[0].metriques.scores_par_canal.length, 1);
  const perturbed = module.appliquer_perturbation(module.generer_univers_detaille(config), {
    cx: 4,
    cy: 2,
    rayon: 1,
    force: 1,
    type: "effacer",
    graine: 7,
  });
  assert.equal(perturbed.lignes.length, config.hauteur);
}

runBuild();
testGeneratedModule()
  .then(() => {
    console.log("generated browser module smoke ok");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
