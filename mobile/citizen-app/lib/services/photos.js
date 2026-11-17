import { apiActive, lireJeton, erreurReseau } from "./http.js";

const COTE_MAX = 1280;
const racine = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

function chargerImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de lire cette photo."));
    image.src = source;
  });
}

export async function preparerPhoto(fichier) {
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = await chargerImage(adresse);
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(adresse);
  }
}

export async function detecterZonesSensibles(source) {
  try {
    const { detecterZones } = await import("./detection.js");
    return await detecterZones(source);
  } catch {
    return { visages: null, plaques: null };
  }
}

export function flouter(source, zones) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const contexte = canvas.getContext("2d");
  contexte.drawImage(source, 0, 0);
  const pixel = Math.max(10, Math.round(Math.max(source.width, source.height) / 60));
  zones.forEach((zone) => {
    const x = Math.max(0, Math.round(zone.x));
    const y = Math.max(0, Math.round(zone.y));
    const largeur = Math.min(source.width - x, Math.round(zone.largeur));
    const hauteur = Math.min(source.height - y, Math.round(zone.hauteur));
    if (largeur < 2 || hauteur < 2) return;
    const petit = document.createElement("canvas");
    petit.width = Math.max(1, Math.round(largeur / pixel));
    petit.height = Math.max(1, Math.round(hauteur / pixel));
    petit.getContext("2d").drawImage(canvas, x, y, largeur, hauteur, 0, 0, petit.width, petit.height);
    contexte.imageSmoothingEnabled = false;
    contexte.drawImage(petit, 0, 0, petit.width, petit.height, x, y, largeur, hauteur);
    contexte.imageSmoothingEnabled = true;
  });
  return canvas;
}

export function empreinte(canvas) {
  const petit = document.createElement("canvas");
  petit.width = 9;
  petit.height = 8;
  const contexte = petit.getContext("2d");
  contexte.drawImage(canvas, 0, 0, 9, 8);
  const pixels = contexte.getImageData(0, 0, 9, 8).data;
  const gris = [];
  for (let i = 0; i < pixels.length; i += 4) gris.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
  let bits = "";
  for (let ligne = 0; ligne < 8; ligne++) {
    for (let colonne = 0; colonne < 8; colonne++) bits += gris[ligne * 9 + colonne] > gris[ligne * 9 + colonne + 1] ? "1" : "0";
  }
  let hexa = "";
  for (let i = 0; i < 64; i += 4) hexa += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hexa;
}

export function exporterPhoto(canvas, qualite = 0.78) {
  const image = canvas.toDataURL("image/jpeg", qualite);
  return { image, empreinte: empreinte(canvas) };
}

export function miniature(image, cote = 480) {
  return chargerImage(image).then((source) => {
    const echelle = Math.min(1, cote / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(source.width * echelle);
    canvas.height = Math.round(source.height * echelle);
    canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  });
}

export async function envoyerPhoto(image) {
  if (!apiActive) return image;
  const fichier = await (await fetch(image)).blob();
  const formulaire = new FormData();
  formulaire.append("fichier", fichier, "signalement.jpg");
  const entetes = {};
  const jeton = lireJeton();
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  let reponse;
  try {
    reponse = await fetch(racine + "/api/v1/photos/", { method: "POST", headers: entetes, body: formulaire });
  } catch {
    throw erreurReseau();
  }
  if (reponse.status === 404 || reponse.status === 405) return null;
  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) throw new Error(donnees && typeof donnees.detail === "string" ? donnees.detail : "La photo n'a pas pu être envoyée.");
  return donnees.url.startsWith("http") ? donnees.url : racine + donnees.url;
}
