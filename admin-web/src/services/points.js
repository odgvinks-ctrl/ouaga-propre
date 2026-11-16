import { lireBase, ecrireBase, delai, nouvelId } from "@donnees/base.js";

export const typesPoint = ["Point de regroupement", "Bac à ordures", "Centre de transit"];

const parDefaut = [
  { id: "p1", nom: "Marché de Gounghin", type: "Point de regroupement", quartier: "Secteur 15", capacite: 12, remplissage: 85, position: { lat: 12.3702, lng: -1.5181 }, structureId: "ramassage-plus" },
  { id: "p2", nom: "École Wend-Puiré", type: "Bac à ordures", quartier: "Secteur 15", capacite: 4, remplissage: 40, position: { lat: 12.3741, lng: -1.5129 }, structureId: "ramassage-plus" },
  { id: "p3", nom: "Carrefour du moulin", type: "Bac à ordures", quartier: "Secteur 16", capacite: 4, remplissage: 100, position: { lat: 12.3663, lng: -1.5089 }, structureId: "ramassage-plus" },
  { id: "p4", nom: "Rond-point des Nations Unies", type: "Point de regroupement", quartier: "Secteur 10", capacite: 15, remplissage: 55, position: { lat: 12.3685, lng: -1.5262 }, structureId: "collecte-express" },
  { id: "p5", nom: "Centre de transit de Tanghin", type: "Centre de transit", quartier: "Secteur 22", capacite: 60, remplissage: 70, position: { lat: 12.3891, lng: -1.5048 }, structureId: "rues-propres" },
  { id: "p6", nom: "Marché de Dassasgho", type: "Point de regroupement", quartier: "Secteur 30", capacite: 10, remplissage: 20, position: { lat: 12.3632, lng: -1.4852 }, structureId: "collecte-express" },
];

function lirePoints(base) {
  if (!base.pointsRegroupement) {
    base.pointsRegroupement = parDefaut;
    ecrireBase(base);
  }
  return base.pointsRegroupement;
}

export function etatRemplissage(remplissage) {
  if (remplissage >= 90) return { label: "Plein", classe: "statut-refus", couleur: "#D71920" };
  if (remplissage >= 60) return { label: "À vider bientôt", classe: "statut-attente", couleur: "#FCD116" };
  return { label: "Disponible", classe: "statut-ok", couleur: "#00853F" };
}

export async function listerPoints() {
  await delai();
  const base = lireBase();
  return lirePoints(base).map((p) => ({
    ...p,
    structureNom: (base.comptes.find((c) => c.id === p.structureId) || {}).nom || "Non attribué",
  }));
}

export async function enregistrerPoint(point) {
  await delai();
  if (!point.nom.trim()) throw new Error("Donnez un nom au point.");
  if (!point.position) throw new Error("Placez le point sur la carte.");
  const capacite = Number(point.capacite);
  if (!capacite || capacite <= 0) throw new Error("La capacité doit être un nombre positif.");
  const base = lireBase();
  const points = lirePoints(base);
  const propre = {
    nom: point.nom.trim(),
    type: point.type,
    quartier: point.quartier,
    capacite,
    remplissage: Math.max(0, Math.min(100, Number(point.remplissage) || 0)),
    position: point.position,
    structureId: point.structureId,
  };
  base.pointsRegroupement = point.id
    ? points.map((p) => (p.id === point.id ? { ...p, ...propre } : p))
    : [...points, { id: nouvelId("p"), ...propre }];
  ecrireBase(base);
}

export async function supprimerPoint(id) {
  await delai();
  const base = lireBase();
  base.pointsRegroupement = lirePoints(base).filter((p) => p.id !== id);
  ecrireBase(base);
}
