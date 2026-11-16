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
