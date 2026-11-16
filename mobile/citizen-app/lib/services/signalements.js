import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";

const actifs = ["a_verifier", "verifie", "transmis", "pris_en_charge"];

function distance(a, b) {
  const rayon = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * rayon * Math.asin(Math.sqrt(h)));
}

function enrichir(base, s) {
  const structure = base.comptes.find((c) => c.id === s.structureId) || {};
  return {
    ...s,
    historique: s.historique || [{ statut: "a_verifier", date: s.date }],
    confirmations: s.confirmations || [],
    structureNom: structure.nom || "",
  };
}

export async function creerSignalement(auteurId, { type, taille, description, quartier, position, photo }) {
  await delai();
  if (!photo) throw new Error("Ajoutez une photo du lieu.");
  if (!quartier) throw new Error("Choisissez le quartier.");
  const base = lireBase();
  const maintenant = new Date().toISOString();
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
    historique: [{ statut: "a_verifier", date: maintenant }],
    confirmations: [],
    date: maintenant,
  };
  base.signalements.push(signalement);
  ecrireBase(base);
  return signalement;
}

export async function getMesSignalements(auteurId) {
  await delai();
  const base = lireBase();
  return base.signalements
    .filter((s) => s.auteurId === auteurId)
    .map((s) => enrichir(base, s))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSignalement(id) {
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  return enrichir(base, signalement);
}

export async function getSignalementsStructure(structureId) {
  await delai();
  const base = lireBase();
  return base.signalements
    .filter((s) => s.structureId === structureId)
    .map((s) => enrichir(base, s))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function changerStatutSignalement(id, statut) {
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  signalement.statut = statut;
  signalement.historique = [...(signalement.historique || []), { statut, date: new Date().toISOString() }];
  ecrireBase(base);
  return signalement;
}

export async function getSignalementsProches(position, rayon = 60) {
  await delai(80);
  if (!position) return [];
  return lireBase()
    .signalements.filter((s) => s.position && actifs.includes(s.statut))
    .map((s) => ({ ...s, distance: distance(position, s.position) }))
    .filter((s) => s.distance <= rayon)
    .sort((a, b) => a.distance - b.distance);
}

export async function confirmerSignalement(id, citoyenId) {
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  if (signalement.auteurId === citoyenId) throw new Error("C'est déjà votre signalement.");
  const confirmations = signalement.confirmations || [];
  if (!confirmations.includes(citoyenId)) signalement.confirmations = [...confirmations, citoyenId];
  ecrireBase(base);
  return signalement;
}

export async function getMesPoints(citoyenId) {
  await delai(80);
  const base = lireBase();
  const miens = base.signalements.filter((s) => s.auteurId === citoyenId);
  const valides = miens.filter((s) => !["a_verifier", "rejete"].includes(s.statut));
  const enVerification = miens.filter((s) => s.statut === "a_verifier").length;
  const confirmes = base.signalements.filter((s) => (s.confirmations || []).includes(citoyenId) && s.statut !== "rejete").length;
  const nettoyes = valides.filter((s) => s.statut === "nettoye").length;
  const gagnes = valides.length * 10 + nettoyes * 5 + confirmes * 5;
  const depenses = (base.echanges || [])
    .filter((e) => e.citoyenId === citoyenId && e.statut !== "refuse")
    .reduce((total, e) => total + e.cout, 0);
  return {
    points: gagnes,
    solde: gagnes - depenses,
    enAttente: enVerification * 10,
    signales: miens.length,
    nettoyes,
    confirmes,
  };
}

export async function getDepotoirsCarte() {
  await delai();
  return lireBase()
    .signalements.filter((s) => ["verifie", "transmis", "pris_en_charge", "nettoye"].includes(s.statut))
    .filter((s) => s.position);
}
