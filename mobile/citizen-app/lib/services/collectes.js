import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { apiActive, requete } from "./http.js";
import { idMaStructure } from "./structures.js";
import { getMesAbonnements } from "./abonnements.js";
import { envoyerPhoto, miniature } from "./photos.js";

function versDate(valeur) {
  if (!valeur) return null;
  return new Date(/Z$|[+-]\d\d:\d\d$/.test(valeur) ? valeur : `${valeur}Z`).toISOString();
}

async function convertirCollecte(c, abonnements = []) {
  const abonnement = abonnements.find((a) => a.id === c.abonnement_id);
  return {
    id: c.id,
    abonnementId: c.abonnement_id,
    citoyenId: c.citoyen_id,
    structureId: c.structure_id,
    volume: c.volume,
    statut: c.statut,
    datePrevue: versDate(c.date_prevue),
    date: versDate(c.date),
    structureNom: abonnement?.structureNom || "Structure",
    citoyenNom: c.citoyen_nom || "Citoyen",
    citoyenTelephone: c.citoyen_telephone || "",
    quartier: c.quartier || abonnement?.quartier || "",
    repere: c.repere || abonnement?.repere || "",
    position: c.latitude && c.longitude ? { lat: c.latitude, lng: c.longitude } : null,
    photoPreuve: c.photo_preuve_url || "",
  };
}

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
    position: abonnement.position || null,
  };
}

export async function demanderCollecte(citoyenId, abonnementId, volume) {
  if (apiActive) {
    const cree = await requete("/api/v1/collectes/", { methode: "POST", corps: { abonnement_id: abonnementId, volume } });
    return convertirCollecte(cree, await getMesAbonnements(citoyenId));
  }
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
  if (apiActive) {
    const [resultat, abonnements] = await Promise.all([requete("/api/v1/collectes/me"), getMesAbonnements(citoyenId)]);
    return Promise.all(resultat.data.map((c) => convertirCollecte(c, abonnements)));
  }
  await delai();
  const base = lireBase();
  return base.collectes
    .filter((c) => c.citoyenId === citoyenId)
    .map((c) => enrichir(base, c))
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function collectesApiStructure() {
  const resultat = await requete(`/api/v1/collectes/structure/${await idMaStructure()}`);
  return Promise.all(resultat.data.map((c) => convertirCollecte(c)));
}

export async function getCollectesStructure(structureId) {
  if (apiActive) return collectesApiStructure();
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
  if (!datePrevue) throw new Error("Choisissez la date et l'heure du passage.");
  if (apiActive) {
    const date = encodeURIComponent(new Date(datePrevue).toISOString());
    return convertirCollecte(await requete(`/api/v1/collectes/${id}/planifier?date_prevue=${date}`, { methode: "PATCH" }));
  }
  await delai();
  return changer(id, { statut: "planifiee", datePrevue: new Date(datePrevue).toISOString() });
}

export async function terminerCollecte(id, photoPreuve) {
  if (!photoPreuve) throw new Error("Prenez une photo après la collecte pour la valider.");
  if (apiActive) {
    const adresse = await envoyerPhoto(photoPreuve);
    return convertirCollecte(await requete(`/api/v1/collectes/${id}/terminer`, { methode: "PATCH", corps: { photo_preuve_url: adresse } }));
  }
  await delai();
  return changer(id, { statut: "faite", photoPreuve: await miniature(photoPreuve, 800) });
}

export async function reporterCollecte(id) {
  if (apiActive) return convertirCollecte(await requete(`/api/v1/collectes/${id}/reporter?jours=1`, { methode: "PATCH" }));
  await delai();
  const demain = new Date(Date.now() + 86400000);
  demain.setHours(9, 0, 0, 0);
  return changer(id, { datePrevue: demain.toISOString() });
}

export async function getTournee(structureId) {
  let miennes;
  if (apiActive) {
    miennes = await collectesApiStructure();
  } else {
    await delai();
    const base = lireBase();
    miennes = base.collectes.filter((c) => c.structureId === structureId).map((c) => enrichir(base, c));
  }
  const finJournee = new Date();
  finJournee.setHours(23, 59, 59, 999);
  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);
  const points = miennes
    .filter((c) => c.statut === "planifiee" && new Date(c.datePrevue) <= finJournee)
    .sort((a, b) => a.datePrevue.localeCompare(b.datePrevue));
  const faites = miennes.filter(
    (c) => c.statut === "faite" && c.datePrevue && new Date(c.datePrevue) >= debutJournee && new Date(c.datePrevue) <= finJournee
  );
  return { points, faites };
}
