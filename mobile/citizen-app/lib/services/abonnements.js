import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";

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
  await delai();
  const base = lireBase();
  return base.abonnements
    .filter((a) => a.citoyenId === citoyenId)
    .map((a) => enrichir(base, a))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDemandesStructure(structureId) {
  await delai();
  const base = lireBase();
  return base.abonnements
    .filter((a) => a.structureId === structureId)
    .map((a) => enrichir(base, a))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function repondreDemande(id, accepter, motif = "") {
  await delai();
  const base = lireBase();
  const abonnement = base.abonnements.find((a) => a.id === id);
  if (!abonnement) throw new Error("Demande introuvable.");
  abonnement.statut = accepter ? "accepte" : "refuse";
  abonnement.motifRefus = accepter ? "" : motif.trim();
  ecrireBase(base);
  return enrichir(base, abonnement);
}
