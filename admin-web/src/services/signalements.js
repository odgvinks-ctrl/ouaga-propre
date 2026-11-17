import { lireBase, ecrireBase, delai } from "@donnees/base.js";
import { apiActive, requete } from "./http.js";

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
    auteurNom: signalement.owner_id ? "Citoyen" : "Anonyme",
    type: String(signalement.type_signalement || "DEPOTOIR_SAUVAGE").toLowerCase().includes("caniveau")
      ? "caniveau"
      : "depotoir",
    taille: "moyen",
    photo: signalement.photo_url || "",
    statut: statutsFrontend[signalement.statut] || "a_verifier",
    date: signalement.created_at,
    position: { lat: signalement.latitude, lng: signalement.longitude },
    structureId: signalement.structure_id,
    confirmations: [],
    fiabilite: { score: signalement.score_confiance ?? 0, raisons: [] },
  };
}

function fiabilite(base, s) {
  const raisons = [];
  let score = 0;
  if (s.photo) {
    score += 30;
    raisons.push("Photo jointe");
  } else {
    raisons.push("Aucune photo");
  }
  if (s.position) {
    score += 20;
    if (s.position.precision && s.position.precision <= 30) {
      score += 15;
      raisons.push(`GPS précis (${s.position.precision} m)`);
    } else {
      score += 5;
      raisons.push("Position placée à la main ou GPS imprécis");
    }
  } else {
    raisons.push("Pas de position");
  }
  if (String(s.auteurId).startsWith("invite-")) raisons.push("Envoyé sans compte");
  if (s.canal === "ussd") {
    score += 10;
    raisons.push("Envoyé par USSD : numéro connu, mais ni photo ni GPS, à vérifier sur place");
  }
  const confirmations = (s.confirmations || []).length;
  if (confirmations) {
    score += Math.min(20, confirmations * 10);
    raisons.push(`Confirmé par ${confirmations} voisin(s)`);
  }
  const autres = base.signalements.filter((x) => x.auteurId === s.auteurId && x.id !== s.id);
  const valides = autres.filter((x) => !["a_verifier", "rejete"].includes(x.statut)).length;
  const rejetes = autres.filter((x) => x.statut === "rejete").length;
  if (valides) {
    score += Math.min(15, valides * 5);
    raisons.push(`${valides} signalement(s) déjà validé(s) par cet auteur`);
  }
  if (rejetes) {
    score -= rejetes * 15;
    raisons.push(`${rejetes} signalement(s) rejeté(s) par le passé`);
  }
  return { score: Math.max(0, Math.min(100, score)), raisons };
}

function nomAuteur(s, auteur) {
  if (auteur.nom) return auteur.nom;
  if (String(s.auteurId).startsWith("ussd-")) return "Téléphone simple (USSD)";
  if (String(s.auteurId).startsWith("invite-")) return "Anonyme (sans compte)";
  return "Citoyen";
}

function enrichir(base, s) {
  const auteur = base.comptes.find((c) => c.id === s.auteurId) || {};
  const structure = base.comptes.find((c) => c.id === s.structureId) || {};
  return {
    ...s,
    historique: s.historique || [{ statut: s.statut, date: s.date }],
    confirmations: s.confirmations || [],
    auteurNom: nomAuteur(s, auteur),
    auteurTelephone: auteur.telephone || s.telephone || "",
    structureNom: structure.nom || "",
    fiabilite: fiabilite(base, s),
  };
}

export async function listerSignalements() {
  if (apiActive) {
    const resultat = await requete("/api/v1/signalements/admin");
    return resultat.data.map(convertirSignalement);
  }
  await delai();
  const base = lireBase();
  return base.signalements.map((s) => enrichir(base, s)).sort((a, b) => b.date.localeCompare(a.date));
}

export function structuresDuSecteur(structures, quartier) {
  const actives = structures.filter((s) => s.statut === "actif");
  const locales = actives.filter((s) => s.quartiers.includes(quartier));
  return locales.length ? locales : actives;
}

function changer(id, changement) {
  const base = lireBase();
  const signalement = base.signalements.find((s) => s.id === id);
  if (!signalement) throw new Error("Signalement introuvable.");
  const maintenant = new Date().toISOString();
  const historique = [...(signalement.historique || [])];
  if (changement.statut === "transmis" && signalement.statut === "a_verifier") {
    historique.push({ statut: "verifie", date: maintenant });
  }
  historique.push({ statut: changement.statut, date: maintenant });
  Object.assign(signalement, changement, { historique });
  ecrireBase(base);
  return enrichir(base, signalement);
}

export async function transmettreSignalement(id, structureId) {
  await delai();
  if (!structureId) throw new Error("Choisissez la structure qui interviendra.");
  if (apiActive) {
    const validation = await requete(`/api/v1/signalements/admin/${id}/statut`, {
      methode: "PATCH",
      corps: { statut: "VALIDE" },
    });
    if (validation.statut !== "VALIDE") throw new Error("Le signalement n'a pas pu être validé.");
    return convertirSignalement(await requete(`/api/v1/signalements/admin/${id}/affecter`, {
      methode: "PATCH",
      corps: { structure_id: structureId },
    }));
  }
  const compte = lireBase().comptes.find((c) => c.id === structureId);
  if (!compte || compte.statut !== "actif") throw new Error("Cette structure n'est pas active.");
  return changer(id, { statut: "transmis", structureId });
}

export async function rejeterSignalement(id, motif) {
  await delai();
  if (!motif.trim()) throw new Error("Indiquez le motif du rejet.");
  if (apiActive) {
    return convertirSignalement(await requete(`/api/v1/signalements/admin/${id}/statut`, {
      methode: "PATCH",
      corps: { statut: "REJETE" },
    }));
  }
  return changer(id, { statut: "rejete", motifRejet: motif.trim() });
}
