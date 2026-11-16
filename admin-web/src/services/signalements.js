import { lireBase, ecrireBase, delai } from "@donnees/base.js";

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

function enrichir(base, s) {
  const auteur = base.comptes.find((c) => c.id === s.auteurId) || {};
  const structure = base.comptes.find((c) => c.id === s.structureId) || {};
  return {
    ...s,
    historique: s.historique || [{ statut: s.statut, date: s.date }],
    confirmations: s.confirmations || [],
    auteurNom: auteur.nom || (String(s.auteurId).startsWith("invite-") ? "Anonyme (sans compte)" : "Citoyen"),
    auteurTelephone: auteur.telephone || "",
    structureNom: structure.nom || "",
    fiabilite: fiabilite(base, s),
  };
}

export async function listerSignalements() {
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
  const compte = lireBase().comptes.find((c) => c.id === structureId);
  if (!compte || compte.statut !== "actif") throw new Error("Cette structure n'est pas active.");
  return changer(id, { statut: "transmis", structureId });
}

export async function rejeterSignalement(id, motif) {
  await delai();
  if (!motif.trim()) throw new Error("Indiquez le motif du rejet.");
  return changer(id, { statut: "rejete", motifRejet: motif.trim() });
}
