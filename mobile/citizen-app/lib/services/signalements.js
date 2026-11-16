import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";

export async function creerSignalement(auteurId, { type, taille, description, quartier, position, photo }) {
  await delai();
  if (!photo) throw new Error("Ajoutez une photo du lieu.");
  if (!quartier) throw new Error("Choisissez le secteur.");
  const base = lireBase();
  const signalement = {
    id: nouvelId("s"),
    auteurId,
    type,
    taille,
    description: description.trim(),
    quartier,
    position,
    photo,
    statut: "a_verifier",
    structureId: null,
    date: new Date().toISOString(),
  };
  base.signalements.push(signalement);
  ecrireBase(base);
  return signalement;
}

export async function getMesSignalements(auteurId) {
  await delai();
  return lireBase()
    .signalements.filter((s) => s.auteurId === auteurId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSignalementsStructure(structureId) {
  await delai();
  return lireBase()
    .signalements.filter((s) => s.structureId === structureId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function changerStatutSignalement(id, statut) {
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  signalement.statut = statut;
  ecrireBase(base);
  return signalement;
}
