import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { apiActive, requete } from "./http.js";
import { convertirStructure, idMaStructure } from "./structures.js";

const fiches = {};

async function ficheStructure(id) {
  if (!fiches[id]) {
    fiches[id] = requete(`/api/v1/structures/${id}`, { auth: false })
      .then(convertirStructure)
      .catch(() => null);
  }
  return fiches[id];
}

export async function convertirAbonnement(a) {
  const structure = await ficheStructure(a.structure_id);
  const formule = structure?.formules.find((f) => f.id === a.formule_id);
  return {
    id: a.id,
    citoyenId: a.citoyen_id,
    structureId: a.structure_id,
    formuleId: a.formule_id,
    quartier: a.quartier,
    repere: a.repere,
    paiement: a.paiement,
    statut: a.statut,
    motifRefus: a.motif_refus || "",
    date: a.created_at,
    structureNom: structure?.nom || "Structure",
    structureTelephone: structure?.telephone || "",
    citoyenNom: a.citoyen_nom || "Citoyen",
    citoyenTelephone: a.citoyen_telephone || "",
    formule: formule || { nom: a.formule_id || "Formule", prix: 0, frequence: "" },
  };
}

function enrichir(base, a) {
  const structure = base.structures.find((s) => s.id === a.structureId);
  const structureCompte = base.comptes.find((c) => c.id === a.structureId) || {};
  const citoyen = base.comptes.find((c) => c.id === a.citoyenId) || {};
  const formule = structure ? structure.formules.find((f) => f.id === a.formuleId) : null;
  return {
    ...a,
    structureNom: structureCompte.nom || "Structure",
    structureTelephone: structureCompte.telephone || "",
    citoyenNom: citoyen.nom || "Citoyen",
    citoyenTelephone: citoyen.telephone || "",
    formule: formule || { nom: "Formule supprimée", prix: 0, frequence: "" },
  };
}

export async function demanderAbonnement(citoyenId, { structureId, formuleId, quartier, repere, paiement }) {
  await delai();
  if (!formuleId) throw new Error("Choisissez une formule.");
  if (!repere.trim()) throw new Error("Indiquez un repère pour trouver votre domicile.");
  if (apiActive) {
    const cree = await requete("/api/v1/abonnements/", {
      methode: "POST",
      corps: { structure_id: structureId, formule_id: formuleId, quartier, repere: repere.trim(), paiement },
    });
    return convertirAbonnement(cree);
  }
  const base = lireBase();
  const dejaLa = base.abonnements.some(
    (a) => a.citoyenId === citoyenId && a.structureId === structureId && a.statut !== "refuse"
  );
  if (dejaLa) throw new Error("Vous avez déjà une demande ou un abonnement chez cette structure.");
  const abonnement = {
    id: nouvelId("a"),
    citoyenId,
    structureId,
    formuleId,
    quartier,
    repere: repere.trim(),
    paiement,
    statut: "en_attente",
    motifRefus: "",
    date: new Date().toISOString(),
  };
  base.abonnements.push(abonnement);
  ecrireBase(base);
  return enrichir(base, abonnement);
}

export async function getMesAbonnements(citoyenId) {
  if (apiActive) {
    const resultat = await requete("/api/v1/abonnements/me");
    return Promise.all(resultat.data.map(convertirAbonnement));
  }
  await delai();
  const base = lireBase();
  return base.abonnements
    .filter((a) => a.citoyenId === citoyenId)
    .map((a) => enrichir(base, a))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDemandesStructure(structureId) {
  if (apiActive) {
    const resultat = await requete(`/api/v1/abonnements/structure/${await idMaStructure()}`);
    return Promise.all(resultat.data.map(convertirAbonnement));
  }
  await delai();
  const base = lireBase();
  return base.abonnements
    .filter((a) => a.structureId === structureId)
    .map((a) => enrichir(base, a))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function repondreDemande(id, accepter, motif = "") {
  if (apiActive) {
    if (!accepter && !motif.trim()) throw new Error("Indiquez le motif du refus.");
    const parametres = new URLSearchParams({ accepter: String(accepter) });
    if (!accepter) parametres.set("motif", motif.trim());
    return convertirAbonnement(await requete(`/api/v1/abonnements/${id}/reponse?${parametres}`, { methode: "PATCH" }));
  }
  await delai();
  const base = lireBase();
  const abonnement = base.abonnements.find((a) => a.id === id);
  if (!abonnement) throw new Error("Demande introuvable.");
  abonnement.statut = accepter ? "accepte" : "refuse";
  abonnement.motifRefus = accepter ? "" : motif.trim();
  ecrireBase(base);
  return enrichir(base, abonnement);
}
