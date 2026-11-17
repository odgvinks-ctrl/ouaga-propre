import * as ort from "onnxruntime-web/wasm";
import wasm from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

ort.env.wasm.wasmPaths = { wasm };
ort.env.wasm.numThreads = 1;
ort.env.logLevel = "error";

const SEUIL_VISAGE = 0.6;
const SEUIL_PLAQUE = 0.3;
const sessions = {};

function session(nom) {
  if (!sessions[nom]) {
    sessions[nom] = ort.InferenceSession.create(`${import.meta.env.BASE_URL}modeles/${nom}.onnx`, { executionProviders: ["wasm"], logSeverityLevel: 3 }).catch((err) => {
      delete sessions[nom];
      throw err;
    });
  }
  return sessions[nom];
}

function pixels(source, largeur, hauteur, placer) {
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  const contexte = canvas.getContext("2d", { willReadFrequently: true });
  placer(contexte);
  return contexte.getImageData(0, 0, largeur, hauteur).data;
}

function tenseur(donnees, largeur, hauteur, convertir) {
  const plan = largeur * hauteur;
  const valeurs = new Float32Array(plan * 3);
  for (let i = 0; i < plan; i++) {
    valeurs[i] = convertir(donnees[i * 4]);
    valeurs[plan + i] = convertir(donnees[i * 4 + 1]);
    valeurs[plan * 2 + i] = convertir(donnees[i * 4 + 2]);
  }
  return new ort.Tensor("float32", valeurs, [1, 3, hauteur, largeur]);
}

function recouvrement(a, b) {
  const largeur = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const hauteur = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const commun = largeur * hauteur;
  return commun / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - commun);
}

function trier(boites, seuil) {
  const gardees = [];
  [...boites]
    .sort((a, b) => b.score - a.score)
    .forEach((boite) => {
      if (gardees.every((g) => recouvrement(g, boite) < seuil)) gardees.push(boite);
    });
  return gardees;
}

function versZone(boite, marge, source) {
  const largeur = boite.x2 - boite.x1;
  const hauteur = boite.y2 - boite.y1;
  const x = Math.max(0, boite.x1 - largeur * marge);
  const y = Math.max(0, boite.y1 - hauteur * marge);
  return {
    x,
    y,
    largeur: Math.min(source.width - x, largeur * (1 + marge * 2)),
    hauteur: Math.min(source.height - y, hauteur * (1 + marge * 2)),
  };
}

export async function detecterVisages(source) {
  const modele = await session("visages");
  const donnees = pixels(source, 640, 480, (c) => c.drawImage(source, 0, 0, 640, 480));
  const resultat = await modele.run({ input: tenseur(donnees, 640, 480, (v) => (v - 127) / 128) });
  const scores = resultat.scores.data;
  const boites = resultat.boxes.data;
  const candidates = [];
  for (let i = 0; i < scores.length / 2; i++) {
    const score = scores[i * 2 + 1];
    if (score < SEUIL_VISAGE) continue;
    candidates.push({
      score,
      x1: boites[i * 4] * source.width,
      y1: boites[i * 4 + 1] * source.height,
      x2: boites[i * 4 + 2] * source.width,
      y2: boites[i * 4 + 3] * source.height,
    });
  }
  return trier(candidates, 0.3).map((b) => versZone(b, 0.2, source));
}

export async function detecterPlaques(source) {
  const modele = await session("plaques");
  const cote = 384;
  const echelle = Math.min(cote / source.width, cote / source.height);
  const largeur = Math.round(source.width * echelle);
  const hauteur = Math.round(source.height * echelle);
  const decalageX = (cote - largeur) / 2;
  const decalageY = (cote - hauteur) / 2;
  const donnees = pixels(source, cote, cote, (c) => {
    c.fillStyle = "#727272";
    c.fillRect(0, 0, cote, cote);
    c.drawImage(source, Math.round(decalageX - 0.1), Math.round(decalageY - 0.1), largeur, hauteur);
  });
  const resultat = await modele.run({ images: tenseur(donnees, cote, cote, (v) => v / 255) });
  const sortie = resultat[modele.outputNames[0]];
  const lignes = sortie.dims[0];
  const candidates = [];
  for (let i = 0; i < lignes; i++) {
    const ligne = sortie.data.slice(i * 7, i * 7 + 7);
    if (ligne[6] < SEUIL_PLAQUE) continue;
    candidates.push({
      score: ligne[6],
      x1: (ligne[1] - decalageX) / echelle,
      y1: (ligne[2] - decalageY) / echelle,
      x2: (ligne[3] - decalageX) / echelle,
      y2: (ligne[4] - decalageY) / echelle,
    });
  }
  return trier(candidates, 0.4).map((b) => versZone(b, 0.15, source));
}

export async function detecterZones(source) {
  const [visages, plaques] = await Promise.all([detecterVisages(source).catch(() => null), detecterPlaques(source).catch(() => null)]);
  return { visages, plaques };
}
