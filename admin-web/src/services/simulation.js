import { lireBase, ecrireBase, delai, nouvelId } from "@donnees/base.js";

export const parametresDefaut = {
  menages: 18000,
  tauxAbonnement: 35,
  preCollecteurs: 40,
  camions: 6,
  camionsEnPanne: 0,
  rotations: 2,
  agentsBrigade: 30,
  tauxPieges: 10,
  saisonPluies: false,
  nouveauQuartier: false,
};

const KG_PAR_MENAGE = 3;
const TONNES_PAR_TRICYCLE = 0.5;
const TONNES_PAR_CAMION = 8;
const MENAGES_NOUVEAU_QUARTIER = 3000;

export function simuler(p) {
  const pluie = p.saisonPluies;
  const menagesTotal = Number(p.menages) + (p.nouveauQuartier ? MENAGES_NOUVEAU_QUARTIER : 0);
  const abonnes = Math.round((Number(p.menages) * Number(p.tauxAbonnement)) / 100);
  const production = (menagesTotal * KG_PAR_MENAGE * (pluie ? 1.15 : 1)) / 1000;
  const productionAbonnes = (abonnes * KG_PAR_MENAGE * (pluie ? 1.15 : 1)) / 1000;
  const camionsActifs = Math.max(0, Number(p.camions) - Number(p.camionsEnPanne));
  const capacitePreCollecte = Number(p.preCollecteurs) * TONNES_PAR_TRICYCLE * (pluie ? 0.75 : 1);
  const capaciteTransport = camionsActifs * Number(p.rotations) * TONNES_PAR_CAMION * (pluie ? 0.7 : 1);
  const collecte = Math.min(productionAbonnes, capacitePreCollecte, capaciteTransport);
  const nonCollecte = Math.max(0, production - collecte);
  const nouveauxDepotoirs = Math.round((nonCollecte * 7 * 0.4) / 4);
  const signalements = Math.round(nouveauxDepotoirs * 1.6 / Math.max(0.05, 1 - Number(p.tauxPieges) / 100));
  const pieges = Math.round((signalements * Number(p.tauxPieges)) / 100);
  const capaciteBrigade = Number(p.agentsBrigade) * (pluie ? 0.6 : 0.8);
  const delaiIntervention = capaciteBrigade > 0 ? Math.max(1, Math.round((nouveauxDepotoirs / capaciteBrigade) * 7)) : null;

  let goulot = "abonnements";
  if (collecte === capaciteTransport && capaciteTransport < productionAbonnes) goulot = "transport";
  else if (collecte === capacitePreCollecte && capacitePreCollecte < productionAbonnes) goulot = "pre-collecte";

  const recommandations = [];
  if (goulot === "transport") {
    const manque = Math.ceil((productionAbonnes - capaciteTransport) / (Number(p.rotations) * TONNES_PAR_CAMION * (pluie ? 0.7 : 1)));
    recommandations.push(`Le transport bloque la collecte : il manque ${manque} camion(s) en service.`);
  }
  if (goulot === "pre-collecte") {
    const manque = Math.ceil((productionAbonnes - capacitePreCollecte) / (TONNES_PAR_TRICYCLE * (pluie ? 0.75 : 1)));
    recommandations.push(`Les pré-collecteurs sont saturés : il en manque ${manque}.`);
  }
  if (Number(p.tauxAbonnement) < 50) {
    recommandations.push("Moins d'un ménage sur deux est abonné : une campagne d'abonnement réduirait les dépotoirs sauvages.");
  }
  if (p.nouveauQuartier) {
    recommandations.push(`Le nouveau quartier ajoute ${MENAGES_NOUVEAU_QUARTIER} ménages sans abonnement : prévoir une structure de pré-collecte dédiée.`);
  }
  if (Number(p.tauxPieges) >= 15) {
    recommandations.push("Beaucoup de faux signalements : renforcer la vérification avant transmission aux structures.");
  }
  if (delaiIntervention !== null && delaiIntervention > 7) {
    recommandations.push(`Délai d'intervention supérieur à une semaine : renforcer la brigade Laabal.`);
  }

  return {
    menagesTotal,
    abonnes,
    production: Math.round(production * 10) / 10,
    collecte: Math.round(collecte * 10) / 10,
    nonCollecte: Math.round(nonCollecte * 10) / 10,
    tauxCollecte: production ? Math.round((collecte / production) * 100) : 0,
    utilisationCamions: capaciteTransport ? Math.min(100, Math.round((collecte / capaciteTransport) * 100)) : 0,
    nouveauxDepotoirs,
    signalements,
    pieges,
    delaiIntervention,
    goulot,
    recommandations,
  };
}

function lireScenarios(base) {
  return base.scenarios || [];
}

export async function listerScenarios() {
  await delai();
  return [...lireScenarios(lireBase())].sort((a, b) => b.date.localeCompare(a.date));
}

export async function enregistrerScenario(nom, parametres) {
  await delai();
  if (!nom.trim()) throw new Error("Donnez un nom au scénario.");
  const base = lireBase();
  const scenario = { id: nouvelId("sc"), nom: nom.trim(), date: new Date().toISOString(), parametres, resultats: simuler(parametres) };
  base.scenarios = [...lireScenarios(base), scenario];
  ecrireBase(base);
  return scenario;
}

export async function supprimerScenario(id) {
  await delai();
  const base = lireBase();
  base.scenarios = lireScenarios(base).filter((s) => s.id !== id);
  ecrireBase(base);
}
