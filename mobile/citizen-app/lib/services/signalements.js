import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { apiActive, lireJeton, requete } from "./http.js";
import { envoyerPhoto, miniature } from "./photos.js";
import { ajouterEnvoi, listerEnvois, reseauDisponible, traiterEnvoi } from "./sync.js";

const actifs = ["a_verifier", "verifie", "transmis", "pris_en_charge"];
const CLE_SUIVI = "ouaga-propre-suivi-signalements";
const statutsFrontend = {
  NOUVEAU: "a_verifier",
  EN_VERIFICATION: "a_verifier",
  VALIDE: "verifie",
  TRANSMIS: "transmis",
  EN_COURS: "pris_en_charge",
  RESOLU: "nettoye",
  REJETE: "rejete",
};

function convertirSignalement(signalement) {
  return {
    ...signalement,
    auteurId: signalement.owner_id,
    type: String(signalement.type_signalement || "DEPOTOIR_SAUVAGE").toLowerCase().includes("caniveau")
      ? "caniveau"
      : "depotoir",
    taille: "moyen",
    photo: signalement.photo_url || "",
    empreinte: signalement.photo_empreinte || "",
    photoApres: signalement.photo_apres_url || "",
    statut: statutsFrontend[signalement.statut] || "a_verifier",
    date: signalement.created_at,
    position: { lat: signalement.latitude, lng: signalement.longitude },
    structureId: signalement.structure_id,
    quartier: signalement.quartier || "",
    motifRejet: signalement.motif_rejet || "",
    confirmations: [],
    historique: [],
  };
}

function enregistrerReferenceSuivi(id, reference) {
  if (!reference) return;
  try {
    const references = JSON.parse(localStorage.getItem(CLE_SUIVI) || "{}");
    references[id] = reference;
    localStorage.setItem(CLE_SUIVI, JSON.stringify(references));
  } catch {
    return;
  }
}

export function lireReferencesSuivi() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SUIVI) || "{}");
  } catch {
    return {};
  }
}

async function getSignalementsSuivis() {
  const references = Object.values(lireReferencesSuivi());
  const resultats = await Promise.all(
    references.map((reference) =>
      requete("/api/v1/signalements/suivi", { methode: "POST", auth: false, corps: { reference } }).catch(() => null)
    )
  );
  return resultats.filter(Boolean).map(convertirSignalement);
}

function lireReferenceSuivi(id) {
  try {
    return JSON.parse(localStorage.getItem(CLE_SUIVI) || "{}")[id] || null;
  } catch {
    return null;
  }
}

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

async function envoyerSignalement({ corps, photo }) {
  const adresse = photo ? await envoyerPhoto(photo) : null;
  const resultat = await requete("/api/v1/signalements/", { methode: "POST", corps: { ...corps, photo_url: adresse } });
  enregistrerReferenceSuivi(resultat.id, resultat.tracking_reference);
  return convertirSignalement(resultat);
}

traiterEnvoi("signalement", envoyerSignalement);

async function mettreEnAttente(envoi, apercu) {
  const id = await ajouterEnvoi("signalement", "/api/v1/signalements/", envoi, apercu);
  return { ...apercu, id: `attente-${id}`, statut: "attente_envoi" };
}

export async function getSignalementsEnAttente() {
  if (!apiActive) return [];
  const envois = await listerEnvois("signalement");
  return envois.map((e) => ({ ...e.apercu, id: `attente-${e.id}`, statut: "attente_envoi", erreurEnvoi: e.statut === "echec" ? e.erreur : "" }));
}

export async function creerSignalement(auteurId, { type, taille, description, quartier, position, photo, empreinte = "", floute = false }) {
  if (!photo) throw new Error("Ajoutez une photo du lieu.");
  if (!quartier) throw new Error("Choisissez le quartier.");
  if (apiActive) {
    const envoi = {
      photo,
      corps: {
        type_signalement: type === "caniveau" ? "CANIVEAU_OBSTRUE" : "DEPOTOIR_SAUVAGE",
        description: description.trim(),
        latitude: position?.lat ?? 12.3714,
        longitude: position?.lng ?? -1.5197,
        quartier,
        photo_empreinte: empreinte,
        photo_floutee: floute,
      },
    };
    const apercu = { type, taille, quartier, description: description.trim(), position, photo: await miniature(photo, 320), date: new Date().toISOString() };
    if (!(await reseauDisponible())) return mettreEnAttente(envoi, apercu);
    try {
      return await envoyerSignalement(envoi);
    } catch (err) {
      if (err.horsLigne) return mettreEnAttente(envoi, apercu);
      throw err;
    }
  }
  await delai();
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
    photo: await miniature(photo, 800),
    empreinte,
    floute,
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
  if (apiActive) {
    const attente = await getSignalementsEnAttente();
    let liste = [];
    try {
      liste = lireJeton() ? (await requete("/api/v1/signalements/me")).data.map(convertirSignalement) : await getSignalementsSuivis();
    } catch (err) {
      if (!err.horsLigne || attente.length === 0) throw err;
    }
    return [...attente, ...liste].sort((a, b) => b.date.localeCompare(a.date));
  }
  await delai();
  const base = lireBase();
  return base.signalements
    .filter((s) => s.auteurId === auteurId)
    .map((s) => enrichir(base, s))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getSignalement(id) {
  if (apiActive) {
    const authentifie = Boolean(lireJeton());
    const reference = lireReferenceSuivi(id);
    if (reference) {
      return convertirSignalement(await requete("/api/v1/signalements/suivi", {
        methode: "POST",
        auth: false,
        corps: { reference },
      }));
    }
    const chemin = authentifie ? `/api/v1/signalements/me/${id}` : `/api/v1/signalements/${id}`;
    return convertirSignalement(await requete(chemin, { auth: authentifie }));
  }
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  return enrichir(base, signalement);
}

export async function getSignalementsStructure(structureId) {
  if (apiActive) {
    const resultat = await requete("/api/v1/signalements/structure/me");
    return resultat.data.map((signalement) => ({
      ...convertirSignalement(signalement),
      structureId,
      auteurNom: "Citoyen",
    }));
  }
  await delai();
  const base = lireBase();
  return base.signalements
    .filter((s) => s.structureId === structureId)
    .map((s) => enrichir(base, s))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function changerStatutSignalement(id, statut, photoApres = "") {
  if (statut === "nettoye" && !photoApres) throw new Error("Prenez une photo du lieu nettoyé pour clôturer.");
  if (apiActive) {
    const statutApi = { pris_en_charge: "pris_en_charge", nettoye: "nettoye" }[statut];
    if (!statutApi) throw new Error("Ce changement de statut n'est pas disponible.");
    const corps = { statut: statutApi };
    if (photoApres) corps.photo_apres_url = await envoyerPhoto(photoApres);
    return convertirSignalement(await requete(`/api/v1/signalements/${id}/structure-statut`, {
      methode: "PATCH",
      corps,
    }));
  }
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  signalement.statut = statut;
  if (photoApres) signalement.photoApres = await miniature(photoApres, 800);
  signalement.historique = [...(signalement.historique || []), { statut, date: new Date().toISOString() }];
  ecrireBase(base);
  return signalement;
}

export async function getSignalementsProches(position, rayon = 60) {
  if (apiActive) {
    if (!position) return [];
    const resultat = await requete("/api/v1/signalements/", { auth: false });
    return resultat.data
      .map(convertirSignalement)
      .filter((signalement) => signalement.position)
      .map((signalement) => ({ ...signalement, distance: distance(position, signalement.position) }))
      .filter((signalement) => signalement.distance <= rayon)
      .sort((a, b) => a.distance - b.distance);
  }
  await delai(80);
  if (!position) return [];
  return lireBase()
    .signalements.filter((s) => s.position && actifs.includes(s.statut))
    .map((s) => ({ ...s, distance: distance(position, s.position) }))
    .filter((s) => s.distance <= rayon)
    .sort((a, b) => a.distance - b.distance);
}

export async function confirmerSignalement(id, citoyenId) {
  if (apiActive) throw new Error("La confirmation des signalements sera disponible dans une prochaine version.");
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
  if (apiActive) {
    const miens = lireJeton() ? (await requete("/api/v1/signalements/me")).data.map(convertirSignalement) : [];
    const valides = miens.filter((s) => !["a_verifier", "rejete"].includes(s.statut));
    const nettoyes = valides.filter((s) => s.statut === "nettoye").length;
    const gagnes = valides.length * 10 + nettoyes * 5;
    const depenses = (lireBase().echanges || [])
      .filter((e) => e.citoyenId === citoyenId && e.statut !== "refuse")
      .reduce((total, e) => total + e.cout, 0);
    return {
      points: gagnes,
      solde: gagnes - depenses,
      enAttente: miens.filter((s) => s.statut === "a_verifier").length * 10,
      signales: miens.length,
      nettoyes,
      confirmes: 0,
    };
  }
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
  if (apiActive) {
    const resultat = await requete("/api/v1/signalements/", { auth: false });
    return resultat.data.map(convertirSignalement).filter((signalement) => signalement.position);
  }
  await delai();
  return lireBase()
    .signalements.filter((s) => ["verifie", "transmis", "pris_en_charge", "nettoye"].includes(s.statut))
    .filter((s) => s.position);
}
