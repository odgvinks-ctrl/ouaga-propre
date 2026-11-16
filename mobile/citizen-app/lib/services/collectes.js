import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";

function enrichir(base, c) {
  const structure = base.comptes.find((x) => x.id === c.structureId) || {};
  const citoyen = base.comptes.find((x) => x.id === c.citoyenId) || {};
  const abonnement = base.abonnements.find((a) => a.id === c.abonnementId) || {};
  return {
    ...c,
    structureNom: structure.nom || "Structure",
    citoyenNom: citoyen.nom || "Citoyen",
    citoyenTelephone: citoyen.telephone || "",
    quartier: abonnement.quartier || "",
    repere: abonnement.repere || "",
  };
}

export async function demanderCollecte(citoyenId, abonnementId, volume) {
  await delai();
  const base = lireBase();
  const abonnement = base.abonnements.find((a) => a.id === abonnementId && a.citoyenId === citoyenId);
  if (!abonnement || abonnement.statut !== "accepte") {
    throw new Error("Il faut un abonnement accepté par la structure pour demander une collecte.");
  }
  const enCours = base.collectes.some(
    (c) => c.abonnementId === abonnementId && (c.statut === "demandee" || c.statut === "planifiee")
  );
  if (enCours) throw new Error("Une collecte est déjà en cours pour cet abonnement.");
  const collecte = {
    id: nouvelId("c"),
    abonnementId,
    citoyenId,
    structureId: abonnement.structureId,
    volume,
    statut: "demandee",
    datePrevue: null,
    date: new Date().toISOString(),
  };
  base.collectes.push(collecte);
  ecrireBase(base);
  return enrichir(base, collecte);
}

export async function getMesCollectes(citoyenId) {
  await delai();
  const base = lireBase();
  return base.collectes
    .filter((c) => c.citoyenId === citoyenId)
    .map((c) => enrichir(base, c))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getCollectesStructure(structureId) {
  await delai();
  const base = lireBase();
  return base.collectes
    .filter((c) => c.structureId === structureId)
    .map((c) => enrichir(base, c))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function changer(id, changement) {
  const base = lireBase();
  const collecte = base.collectes.find((c) => c.id === id);
  if (!collecte) throw new Error("Collecte introuvable.");
  Object.assign(collecte, changement);
  ecrireBase(base);
  return enrichir(base, collecte);
}

export async function planifierCollecte(id, datePrevue) {
  await delai();
  if (!datePrevue) throw new Error("Choisissez la date et l'heure du passage.");
  return changer(id, { statut: "planifiee", datePrevue: new Date(datePrevue).toISOString() });
}

export async function terminerCollecte(id) {
  await delai();
  return changer(id, { statut: "faite" });
}
