import { lireBase, delai } from "@donnees/base.js";
import { apiActive } from "./http.js";
import { chargerBase } from "./base-api.js";

const JOUR = 86400000;

function debutJour(decalage) {
  const d = new Date(Date.now() - decalage * JOUR);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTableauDeBord() {
  await delai();
  const base = await chargerBase();
  const signalements = base.signalements;
  const actifs = signalements.filter((s) => ["verifie", "transmis", "pris_en_charge"].includes(s.statut));
  const depuis30 = Date.now() - 30 * JOUR;
  const nettoyes30 = signalements.filter((s) => {
    if (s.statut !== "nettoye") return false;
    const trace = (s.historique || []).find((h) => h.statut === "nettoye");
    return new Date(trace ? trace.date : s.date).getTime() >= depuis30;
  }).length;

  const jours = Array.from({ length: 7 }, (_, i) => {
    const debut = debutJour(6 - i);
    const fin = new Date(debut.getTime() + JOUR);
    const duJour = signalements.filter((s) => {
      const d = new Date(s.date);
      return d >= debut && d < fin;
    });
    const collectes = base.collectes.filter((c) => {
      if (c.statut !== "faite" || !c.datePrevue) return false;
      const d = new Date(c.datePrevue);
      return d >= debut && d < fin;
    });
    return { date: debut, signalements: duJour.length, collectes: collectes.length };
  });

  const parSecteur = {};
  actifs.forEach((s) => {
    parSecteur[s.quartier] = (parSecteur[s.quartier] || 0) + 1;
  });

  const structures = base.comptes.filter((c) => c.role === "structure");
  const vehicules = base.vehicules || [];
  const points = base.pointsRegroupement || [];

  return {
    aVerifier: signalements.filter((s) => s.statut === "a_verifier").sort((a, b) => a.date.localeCompare(b.date)),
    depotoirsActifs: actifs.length,
    enAttenteIntervention: signalements.filter((s) => s.statut === "transmis").length,
    nettoyes30,
    structuresEnAttente: structures.filter((s) => s.statut === "en_attente"),
    structuresActives: structures.filter((s) => s.statut === "actif").length,
    abonnes: base.abonnements.filter((a) => a.statut === "accepte").length,
    citoyens: base.comptes.filter((c) => c.role === "citoyen").length,
    vehiculesEnPanne: vehicules.filter((v) => v.statut === "en_panne").length,
    vehicules: vehicules.length,
    pointsPleins: points.filter((p) => p.remplissage >= 90).length,
    jours,
    secteurs: Object.entries(parSecteur).sort((a, b) => b[1] - a[1]).slice(0, 6),
    carte: signalements.filter((s) => s.position && s.statut !== "rejete"),
  };
}

export async function getAbonnesCarte() {
  if (apiActive) return [];
  await delai();
  const base = lireBase();
  return base.abonnements
    .filter((a) => a.statut === "accepte" && a.position)
    .map((a) => ({
      id: a.id,
      position: a.position,
      quartier: a.quartier,
      citoyenNom: (base.comptes.find((c) => c.id === a.citoyenId) || {}).nom || "Abonné",
      structureNom: (base.comptes.find((c) => c.id === a.structureId) || {}).nom || "",
    }));
}
