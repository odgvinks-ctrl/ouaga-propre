import { lireBase, ecrireBase, delai } from "@donnees/base.js";

const JOUR = 86400000;

function performance(base, structure) {
  const compte = base.comptes.find((c) => c.id === structure.id) || {};
  const abonnements = base.abonnements.filter((a) => a.structureId === structure.id);
  const collectes = base.collectes.filter((c) => c.structureId === structure.id);
  const signalements = base.signalements.filter((s) => s.structureId === structure.id);
  const vehicules = (base.vehicules || []).filter((v) => v.structureId === structure.id);
  const equipes = (base.equipes || []).filter((e) => e.structureId === structure.id);
  const depuis = Date.now() - 30 * JOUR;
  const nettoyes = signalements.filter((s) => s.statut === "nettoye").length;
  return {
    ...structure,
    nom: compte.nom || "",
    telephone: compte.telephone || "",
    statut: compte.statut || "en_attente",
    motifRefus: compte.motifRefus || "",
    dateValidation: compte.dateValidation || "",
    abonnes: abonnements.filter((a) => a.statut === "accepte").length,
    demandesEnAttente: abonnements.filter((a) => a.statut === "en_attente").length,
    collectesFaites: collectes.filter((c) => c.statut === "faite" && c.datePrevue && new Date(c.datePrevue).getTime() >= depuis).length,
    collectesEnCours: collectes.filter((c) => c.statut === "demandee" || c.statut === "planifiee").length,
    interventions: signalements.length,
    nettoyes,
    tauxNettoyage: signalements.length ? Math.round((nettoyes / signalements.length) * 100) : null,
    vehicules: vehicules.length,
    vehiculesEnPanne: vehicules.filter((v) => v.statut === "en_panne").length,
    equipe: equipes.length,
  };
}

export async function listerStructures() {
  await delai();
  const base = lireBase();
  return base.structures.map((s) => performance(base, s));
}

function changerCompte(id, changement) {
  const base = lireBase();
  const compte = base.comptes.find((c) => c.id === id && c.role === "structure");
  if (!compte) throw new Error("Structure introuvable.");
  Object.assign(compte, changement);
  ecrireBase(base);
}

export async function validerStructure(id) {
  await delai();
  changerCompte(id, { statut: "actif", motifRefus: "", dateValidation: new Date().toISOString() });
}

export async function refuserStructure(id, motif) {
  await delai();
  if (!motif.trim()) throw new Error("Indiquez le motif du refus : la structure le verra.");
  changerCompte(id, { statut: "refuse", motifRefus: motif.trim() });
}
