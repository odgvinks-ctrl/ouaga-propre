import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { getMesPoints } from "./signalements.js";
import { cadeaux, operateurs } from "../models/recompenses.js";

function codeBon() {
  return `FN-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

export async function echangerPoints(citoyenId, { cadeauCle, operateur, numero }) {
  const cadeau = cadeaux.find((c) => c.cle === cadeauCle);
  if (!cadeau) throw new Error("Cadeau introuvable.");
  const { solde } = await getMesPoints(citoyenId);
  if (solde < cadeau.cout) throw new Error(`Il vous manque ${cadeau.cout - solde} points pour ce cadeau.`);
  const bon = cadeau.categorie === "bon";
  const telephone = String(numero || "").replace(/\D/g, "").slice(-8);
  if (!bon && !operateurs.includes(operateur)) throw new Error("Choisissez votre opérateur.");
  if (!bon && telephone.length !== 8) throw new Error("Le numéro doit contenir 8 chiffres.");
  await delai();
  const base = lireBase();
  const echange = {
    id: nouvelId("e"),
    citoyenId,
    cadeauCle: cadeau.cle,
    label: cadeau.label,
    categorie: cadeau.categorie,
    cout: cadeau.cout,
    operateur: bon ? "" : operateur,
    numero: bon ? "" : telephone,
    code: bon ? codeBon() : "",
    statut: "en_attente",
    date: new Date().toISOString(),
  };
  base.echanges = [...(base.echanges || []), echange];
  ecrireBase(base);
  return echange;
}

export async function getMesEchanges(citoyenId) {
  await delai();
  return (lireBase().echanges || []).filter((e) => e.citoyenId === citoyenId).sort((a, b) => b.date.localeCompare(a.date));
}
