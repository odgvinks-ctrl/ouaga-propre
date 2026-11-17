import { quartiers } from "../models/quartiers.js";

function normaliser(texte) {
  return String(texte || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const index = quartiers.map((nom) => ({ nom, cle: normaliser(nom) }));

function correspondance(nom) {
  const cle = normaliser(nom);
  if (cle.length < 3) return null;
  const exact = index.find((q) => q.cle === cle);
  if (exact) return exact.nom;
  const proche = index.find((q) => cle.includes(q.cle) || q.cle.includes(cle));
  return proche ? proche.nom : null;
}

export async function detecterQuartier(position) {
  if (!position || !navigator.onLine) return null;
  const adresse = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=fr&lat=${position.lat}&lon=${position.lng}`;
  try {
    const controleur = new AbortController();
    const minuterie = setTimeout(() => controleur.abort(), 6000);
    const reponse = await fetch(adresse, { signal: controleur.signal });
    clearTimeout(minuterie);
    if (!reponse.ok) return null;
    const donnees = await reponse.json();
    const champs = ["neighbourhood", "quarter", "suburb", "city_district", "village", "hamlet"];
    for (const champ of champs) {
      const trouve = correspondance(donnees.address?.[champ]);
      if (trouve) return trouve;
    }
    return correspondance(donnees.name);
  } catch {
    return null;
  }
}
