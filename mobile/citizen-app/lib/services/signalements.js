import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { apiActive, lireJeton, requete } from "./http.js";

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
    statut: statutsFrontend[signalement.statut] || "a_verifier",
    date: signalement.created_at,
    position: { lat: signalement.latitude, lng: signalement.longitude },
    structureId: signalement.structure_id,
    quartier: signalement.quartier || "",
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

export async function creerSignalement(auteurId, { type, taille, description, quartier, position, photo }) {
  if (!photo) throw new Error("Ajoutez une photo du lieu.");
  if (!quartier) throw new Error("Choisissez le quartier.");
  if (apiActive) {
    const resultat = await requete("/api/v1/signalements/", {
      methode: "POST",
      corps: {
        type_signalement: type === "caniveau" ? "CANIVEAU_OBSTRUE" : "DEPOTOIR_SAUVAGE",
        description: description.trim(),
        photo_url: photo,
        latitude: position?.lat ?? 12.3714,
        longitude: position?.lng ?? -1.5197,
        quartier,
      },
    });
    enregistrerReferenceSuivi(resultat.id, resultat.tracking_reference);
    return convertirSignalement(resultat);
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
    photo,
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
    const resultat = await requete("/api/v1/signalements/me");
    return resultat.data.map(convertirSignalement).sort((a, b) => b.date.localeCompare(a.date));
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

export async function changerStatutSignalement(id, statut) {
  if (apiActive) {
    const statutApi = { pris_en_charge: "pris_en_charge", nettoye: "nettoye" }[statut];
    if (!statutApi) throw new Error("Ce changement de statut n'est pas disponible.");
    return convertirSignalement(await requete(`/api/v1/signalements/${id}/structure-statut`, {
      methode: "PATCH",
      corps: { statut: statutApi },
    }));
  }
  await delai();
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  signalement.statut = statut;
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
