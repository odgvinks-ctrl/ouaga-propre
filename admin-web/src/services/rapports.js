import { delai } from "@donnees/base.js";
import { chargerBase, derniereBase } from "./base-api.js";

const JOUR = 86400000;

function dateEtape(s, statut) {
  const trace = (s.historique || []).find((h) => h.statut === statut);
  return trace ? new Date(trace.date).getTime() : null;
}

export async function getRapport(jours) {
  await delai();
  const base = await chargerBase();
  const depuis = jours ? Date.now() - jours * JOUR : 0;
  const dansPeriode = (iso) => iso && new Date(iso).getTime() >= depuis;

  const signalements = base.signalements.filter((s) => dansPeriode(s.date));
  const nettoyes = base.signalements.filter((s) => s.statut === "nettoye" && (dateEtape(s, "nettoye") || 0) >= depuis);
  const delais = nettoyes
    .map((s) => (dateEtape(s, "nettoye") - new Date(s.date).getTime()) / JOUR)
    .filter((d) => d >= 0);
  const collectes = base.collectes.filter((c) => c.statut === "faite" && dansPeriode(c.datePrevue));
  const abonnements = base.abonnements.filter((a) => a.statut === "accepte" && dansPeriode(a.date));

  const secteurs = {};
  signalements.forEach((s) => {
    secteurs[s.quartier] = secteurs[s.quartier] || { recus: 0, rejetes: 0, nettoyes: 0 };
    secteurs[s.quartier].recus += 1;
    if (s.statut === "rejete") secteurs[s.quartier].rejetes += 1;
    if (s.statut === "nettoye") secteurs[s.quartier].nettoyes += 1;
  });

  const structures = base.comptes
    .filter((c) => c.role === "structure" && c.statut === "actif")
    .map((c) => ({
      nom: c.nom,
      interventions: base.signalements.filter((s) => s.structureId === c.id && dansPeriode(s.date)).length,
      nettoyes: nettoyes.filter((s) => s.structureId === c.id).length,
      collectes: collectes.filter((x) => x.structureId === c.id).length,
      abonnes: base.abonnements.filter((a) => a.structureId === c.id && a.statut === "accepte").length,
    }));

  return {
    recus: signalements.length,
    transmis: signalements.filter((s) => ["transmis", "pris_en_charge", "nettoye"].includes(s.statut)).length,
    rejetes: signalements.filter((s) => s.statut === "rejete").length,
    enAttente: signalements.filter((s) => s.statut === "a_verifier").length,
    nettoyes: nettoyes.length,
    delaiMoyen: delais.length ? Math.round((delais.reduce((t, d) => t + d, 0) / delais.length) * 10) / 10 : null,
    collectes: collectes.length,
    nouveauxAbonnes: abonnements.length,
    secteurs: Object.entries(secteurs).sort((a, b) => b[1].recus - a[1].recus),
    structures,
  };
}

export function donneesExport() {
  const base = derniereBase();
  const nom = (id) => (base.comptes.find((c) => c.id === id) || {}).nom || "";
  return { base, nom };
}
