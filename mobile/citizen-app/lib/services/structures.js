import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";

function avecCompte(base, structure) {
  const compte = base.comptes.find((c) => c.id === structure.id) || {};
  return { ...structure, nom: compte.nom || "", telephone: compte.telephone || "", statut: compte.statut };
}

export function prixMinimum(structure) {
  if (!structure.formules.length) return null;
  return Math.min(...structure.formules.map((f) => f.prix));
}

export async function getStructures(quartier) {
  await delai();
  const base = lireBase();
  return base.structures
    .map((s) => avecCompte(base, s))
    .filter((s) => s.statut === "actif")
    .filter((s) => !quartier || s.quartiers.includes(quartier));
}

export async function getStructure(id) {
  await delai();
  const base = lireBase();
  const structure = base.structures.find((s) => s.id === id);
  if (!structure) throw new Error("Structure introuvable.");
  const abonnes = base.abonnements.filter((a) => a.structureId === id && a.statut === "accepte").length;
  return { ...avecCompte(base, structure), abonnes };
}

function modifierStructure(id, changement) {
  const base = lireBase();
  const index = base.structures.findIndex((s) => s.id === id);
  if (index === -1) throw new Error("Structure introuvable.");
  base.structures[index] = changement(base.structures[index]);
  ecrireBase(base);
  return avecCompte(base, base.structures[index]);
}

export async function modifierProfil(id, { type, responsable, whatsapp, description }) {
  await delai();
  if (!responsable.trim()) throw new Error("Indiquez le nom du responsable.");
  return modifierStructure(id, (s) => ({
    ...s,
    type,
    responsable: responsable.trim(),
    whatsapp: whatsapp.replace(/\D/g, "").slice(-8),
    description: description.trim(),
  }));
}

export async function enregistrerQuartiers(id, quartiers) {
  await delai();
  if (!quartiers.length) throw new Error("Choisissez au moins un secteur.");
  return modifierStructure(id, (s) => ({ ...s, quartiers }));
}

export async function enregistrerFormule(id, formule) {
  await delai();
  const prix = Number(formule.prix);
  if (!formule.nom.trim()) throw new Error("Donnez un nom à la formule.");
  if (!prix || prix < 0) throw new Error("Le prix doit être un nombre positif.");
  if (!formule.frequence.trim()) throw new Error("Indiquez la fréquence de passage.");
  const propre = { nom: formule.nom.trim(), prix, frequence: formule.frequence.trim() };
  return modifierStructure(id, (s) => ({
    ...s,
    formules: formule.id
      ? s.formules.map((f) => (f.id === formule.id ? { ...f, ...propre } : f))
      : [...s.formules, { id: nouvelId("f"), ...propre }],
  }));
}

export async function supprimerFormule(id, formuleId) {
  await delai();
  return modifierStructure(id, (s) => ({ ...s, formules: s.formules.filter((f) => f.id !== formuleId) }));
}
