import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { apiActive, lireJeton, requete } from "./http.js";

function avecCompte(base, structure) {
  const compte = base.comptes.find((c) => c.id === structure.id) || {};
  return { ...structure, nom: compte.nom || "", telephone: compte.telephone || "", statut: compte.statut };
}

export function prixMinimum(structure) {
  if (!structure.formules.length) return null;
  return Math.min(...structure.formules.map((f) => f.prix));
}

function lireFormules(texte) {
  try {
    const liste = JSON.parse(texte || "[]");
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

let maStructure = null;

function estStructure() {
  try {
    return JSON.parse(localStorage.getItem("ouaga-propre-user") || "null")?.role === "structure";
  } catch {
    return false;
  }
}

async function chargerMaStructure() {
  if (!lireJeton() || !estStructure()) return null;
  if (maStructure && maStructure.jeton === lireJeton()) return maStructure.fiche;
  let fiche = null;
  try {
    fiche = await requete("/api/v1/structures/moi");
  } catch {
    fiche = null;
  }
  maStructure = { jeton: lireJeton(), fiche };
  return fiche;
}

export async function idMaStructure() {
  const fiche = await chargerMaStructure();
  if (!fiche) throw new Error("Aucune structure liée à ce compte.");
  return fiche.id;
}

export function convertirStructure(structure) {
  return {
    id: structure.id,
    nom: structure.nom,
    type: "GIE",
    responsable: structure.responsable,
    telephone: structure.telephone,
    whatsapp: structure.telephone,
    description: structure.description || "",
    quartiers: String(structure.zones_intervention || "")
      .split(",")
      .map((q) => q.trim())
      .filter(Boolean),
    formules: lireFormules(structure.formules),
    statut: structure.validated ? "actif" : structure.statut || "en_attente",
    motifRefus: structure.motif_refus || "",
    abonnes: 0,
  };
}

export async function getStructures(quartier) {
  if (apiActive) {
    const resultat = await requete("/api/v1/structures/", { auth: false });
    return resultat.data.map(convertirStructure).filter((s) => !quartier || s.quartiers.includes(quartier));
  }
  await delai();
  const base = lireBase();
  return base.structures
    .map((s) => avecCompte(base, s))
    .filter((s) => s.statut === "actif")
    .filter((s) => !quartier || s.quartiers.includes(quartier));
}

export async function getStructure(id) {
  if (apiActive) {
    const mienne = await chargerMaStructure();
    if (mienne) {
      maStructure = null;
      const fraiche = await chargerMaStructure();
      if (fraiche) return convertirStructure(fraiche);
    }
    return convertirStructure(await requete(`/api/v1/structures/${id}`, { auth: false }));
  }
  await delai();
  const base = lireBase();
  const structure = base.structures.find((s) => s.id === id);
  if (!structure) throw new Error("Structure introuvable.");
  const abonnes = base.abonnements.filter((a) => a.structureId === id && a.statut === "accepte").length;
  return { ...avecCompte(base, structure), abonnes };
}

async function modifierMaStructure(changement) {
  const actuelle = convertirStructure(await requete("/api/v1/structures/moi"));
  const suivante = changement(actuelle);
  maStructure = null;
  const fiche = await requete("/api/v1/structures/moi", {
    methode: "PATCH",
    corps: {
      responsable: suivante.responsable,
      telephone: suivante.whatsapp || suivante.telephone,
      description: suivante.description,
      zones_intervention: suivante.quartiers.join(", "),
      formules: JSON.stringify(suivante.formules),
    },
  });
  return convertirStructure(fiche);
}

function modifierStructure(id, changement) {
  if (apiActive) return modifierMaStructure(changement);
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
  if (!quartiers.length) throw new Error("Choisissez au moins un quartier.");
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
