export const badges = [
  { cle: "premier", label: "Premier signalement", seuil: 10 },
  { cle: "vigilant", label: "Œil vigilant", seuil: 50 },
  { cle: "gardien", label: "Gardien du quartier", seuil: 150 },
  { cle: "heros", label: "Héros de Ouaga", seuil: 300 },
];

export function prochainBadge(points) {
  return badges.find((b) => points < b.seuil) || null;
}

export function progression(points) {
  const prochain = prochainBadge(points);
  if (!prochain) return 100;
  const index = badges.indexOf(prochain);
  const depart = index === 0 ? 0 : badges[index - 1].seuil;
  return Math.round(((points - depart) / (prochain.seuil - depart)) * 100);
}

export const etapesSignalement = [
  { statut: "a_verifier", label: "Envoyé" },
  { statut: "verifie", label: "Vérifié par la mairie" },
  { statut: "transmis", label: "Transmis à une structure" },
  { statut: "pris_en_charge", label: "Pris en charge" },
  { statut: "nettoye", label: "Nettoyé" },
];

export function rangEtape(statut) {
  return etapesSignalement.findIndex((e) => e.statut === statut);
}

export const POINTS_SIGNALEMENT = 10;

export const operateurs = ["Orange", "Moov Africa", "Telecel"];

export const categoriesCadeau = {
  unites: "Unités",
  mega: "Internet",
  sms: "SMS",
  bon: "Bons de réduction",
};

export const cadeaux = [
  { cle: "sms-100", categorie: "sms", label: "100 SMS", detail: "Valables 7 jours", cout: 20 },
  { cle: "mega-500", categorie: "mega", label: "500 Mo d'internet", detail: "Valables 7 jours", cout: 35 },
  { cle: "unites-500", categorie: "unites", label: "500 F d'unités", detail: "Crédit d'appel", cout: 40 },
  { cle: "mega-1000", categorie: "mega", label: "1 Go d'internet", detail: "Valable 30 jours", cout: 60 },
  { cle: "unites-1000", categorie: "unites", label: "1 000 F d'unités", detail: "Crédit d'appel", cout: 75 },
  { cle: "bon-commerce", categorie: "bon", label: "Bon de 10 %", detail: "Chez les commerçants partenaires de la mairie", cout: 30 },
  { cle: "bon-abonnement", categorie: "bon", label: "Bon de 1 000 F", detail: "Sur votre abonnement à la pré-collecte", cout: 50 },
];

export const statutsEchange = {
  en_attente: { label: "En préparation", classe: "statut-attente" },
  envoye: { label: "Envoyé", classe: "statut-ok" },
  refuse: { label: "Refusé, points rendus", classe: "statut-refus" },
};
