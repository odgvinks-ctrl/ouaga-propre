import { lireBase, ecrireBase, delai } from "@donnees/base.js";
import { apiActive, requete } from "./http.js";

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

function lireJson(texte, defaut) {
  try {
    return JSON.parse(texte || "") ?? defaut;
  } catch {
    return defaut;
  }
}

function statutStructure(structure) {
  if (structure.statut === "refuse") return "refuse";
  if (!structure.validated) return "en_attente";
  return structure.compte_actif === false ? "suspendu" : "actif";
}

function convertirStructure(structure) {
  return {
    id: structure.id,
    compteId: structure.owner_id,
    nom: structure.nom,
    type: structure.type_structure || "GIE",
    responsable: structure.responsable,
    telephone: structure.telephone,
    whatsapp: structure.telephone,
    description: structure.description || "",
    quartiers: String(structure.zones_intervention || "")
      .split(",")
      .map((q) => q.trim())
      .filter(Boolean),
    statut: statutStructure(structure),
    numeroEnregistrement: structure.numero_enregistrement || "",
    numeroCnib: structure.numero_cnib || "",
    ifu: structure.ifu || "",
    numeroAutorisation: structure.numero_autorisation || "",
    pieces: lireJson(structure.pieces, {}),
    conditions: structure.conditions_acceptees_le
      ? { version: structure.conditions_version, commission: structure.conditions_commission, date: structure.conditions_acceptees_le }
      : null,
    formules: lireJson(structure.formules, []),
    motifRefus: structure.motif_refus || "",
    dateValidation: "",
    date: structure.created_at || "",
    abonnes: 0,
    demandesEnAttente: 0,
    collectesFaites: 0,
    collectesEnCours: 0,
    interventions: 0,
    nettoyes: 0,
    tauxNettoyage: null,
    vehicules: 0,
    vehiculesEnPanne: 0,
    equipe: 0,
  };
}

export async function listerStructures() {
  if (apiActive) {
    const liste = await requete("/api/v1/structures/admin/toutes");
    return liste.map(convertirStructure);
  }
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
  if (apiActive) {
    await requete(`/api/v1/structures/admin/${id}/valider`, { methode: "PATCH" });
    return;
  }
  await delai();
  const fiche = lireBase().structures.find((s) => s.id === id) || {};
  if (!(fiche.pieces || {}).autorisation) throw new Error("Impossible de valider : l'autorisation de pré-collecte de la mairie manque.");
  if (!fiche.conditions) throw new Error("Impossible de valider : la structure n'a pas accepté les conditions de partenariat.");
  changerCompte(id, { statut: "actif", motifRefus: "", dateValidation: new Date().toISOString() });
}

export async function refuserStructure(id, motif) {
  if (!motif.trim()) throw new Error("Indiquez le motif du refus : la structure le verra.");
  if (apiActive) {
    await requete(`/api/v1/structures/admin/${id}/refuser`, { methode: "PATCH", corps: { motif: motif.trim() } });
    return;
  }
  await delai();
  changerCompte(id, { statut: "refuse", motifRefus: motif.trim() });
}
