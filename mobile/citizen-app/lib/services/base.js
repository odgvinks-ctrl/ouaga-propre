const CLE = "ouaga-propre-base-v1";
let secours = null;

export const delai = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

function ilYA(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

function dans(heures) {
  return new Date(Date.now() + heures * 3600000).toISOString();
}

export function nouvelId(prefixe) {
  return `${prefixe}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function graine() {
  const compte = (id, nom, telephone, role, statut, secteur) => ({
    id,
    nom,
    telephone,
    password: "demo1234",
    role,
    statut,
    secteur,
  });

  const comptes = [
    { ...compte("admin", "Administration Ouaga Propre", "70000000", "admin", "actif", ""), password: "admin1234" },
    compte("mariam", "Mariam Ouédraogo", "70112233", "citoyen", "actif", "Secteur 15"),
    compte("awa", "Awa Kaboré", "70445566", "citoyen", "actif", "Secteur 15"),
    compte("issouf", "Issouf Sawadogo", "76554433", "citoyen", "actif", "Secteur 16"),
    compte("ramassage-plus", "GIE Ramassage Plus", "70223344", "structure", "actif", "Secteur 15"),
    compte("rues-propres", "Association Rues Propres", "71889900", "structure", "actif", "Secteur 22"),
    compte("collecte-express", "Collecte Express SARL", "75667788", "structure", "actif", "Secteur 10"),
    compte("nouvelle-aube", "GIE Nouvelle Aube", "78990011", "structure", "en_attente", "Secteur 28"),
  ];

  const structures = [
    {
      id: "ramassage-plus",
      type: "GIE",
      responsable: "Boukary Zongo",
      whatsapp: "70223344",
      numeroEnregistrement: "GIE-OUA-2021-0148",
      piece: "recepisse-gie.pdf",
      description: "Pré-collecte des ordures ménagères en tricycle, 6 jours sur 7.",
      quartiers: ["Secteur 15", "Secteur 16", "Secteur 17"],
      formules: [
        { id: "rp-standard", nom: "Standard", prix: 2000, frequence: "2 passages par semaine" },
        { id: "rp-demande", nom: "À la demande", prix: 1500, frequence: "4 collectes par mois" },
      ],
    },
    {
      id: "rues-propres",
      type: "Association",
      responsable: "Salimata Ilboudo",
      whatsapp: "71889900",
      numeroEnregistrement: "ASSO-OUA-2019-0532",
      piece: "recepisse-association.pdf",
      description: "Association de femmes du quartier : collecte et curage des caniveaux.",
      quartiers: ["Secteur 22", "Secteur 23"],
      formules: [{ id: "rpr-standard", nom: "Standard", prix: 1500, frequence: "2 passages par semaine" }],
    },
    {
      id: "collecte-express",
      type: "Entreprise",
      responsable: "Salif Compaoré",
      whatsapp: "75667788",
      numeroEnregistrement: "BF-OUA-2020-B-1123",
      piece: "rccm.pdf",
      description: "Collecte par camion benne pour ménages, cours communes et commerces.",
      quartiers: ["Secteur 10", "Secteur 15", "Secteur 30"],
      formules: [
        { id: "ce-standard", nom: "Standard", prix: 2500, frequence: "2 passages par semaine" },
        { id: "ce-premium", nom: "Premium", prix: 4000, frequence: "3 passages par semaine" },
      ],
    },
    {
      id: "nouvelle-aube",
      type: "GIE",
      responsable: "Rasmata Nikiéma",
      whatsapp: "78990011",
      numeroEnregistrement: "GIE-OUA-2026-0091",
      piece: "recepisse.jpg",
      description: "",
      quartiers: ["Secteur 28"],
      formules: [],
    },
  ];

  const signalements = [
    { id: "s1", auteurId: "mariam", type: "depotoir", taille: "moyen", description: "Tas d'ordures derrière le marché.", quartier: "Secteur 15", position: { lat: 12.3721, lng: -1.5152, precision: 12 }, photo: "photo-s1.jpg", statut: "transmis", structureId: "ramassage-plus", date: ilYA(60 * 26) },
    { id: "s2", auteurId: "mariam", type: "caniveau", taille: "grand", description: "Caniveau bouché devant l'école.", quartier: "Secteur 15", position: { lat: 12.3709, lng: -1.5168, precision: 9 }, photo: "photo-s2.jpg", statut: "a_verifier", structureId: null, date: ilYA(90) },
    { id: "s3", auteurId: "awa", type: "depotoir", taille: "grand", description: "Dépôt de gravats et plastiques.", quartier: "Secteur 16", position: { lat: 12.3655, lng: -1.5101, precision: 15 }, photo: "photo-s3.jpg", statut: "pris_en_charge", structureId: "ramassage-plus", date: ilYA(60 * 50) },
    { id: "s4", auteurId: "issouf", type: "caniveau", taille: "moyen", description: "Eau stagnante, odeur forte.", quartier: "Secteur 22", position: { lat: 12.3588, lng: -1.4987, precision: 20 }, photo: "photo-s4.jpg", statut: "transmis", structureId: "rues-propres", date: ilYA(60 * 8) },
    { id: "s5", auteurId: "mariam", type: "depotoir", taille: "petit", description: "", quartier: "Secteur 15", position: { lat: 12.3732, lng: -1.5141, precision: 10 }, photo: "photo-s5.jpg", statut: "nettoye", structureId: "ramassage-plus", date: ilYA(60 * 24 * 6) },
  ];

  const abonnements = [
    { id: "a1", citoyenId: "mariam", structureId: "ramassage-plus", formuleId: "rp-standard", quartier: "Secteur 15", repere: "Portail bleu après la boutique", paiement: "orange_money", statut: "accepte", motifRefus: "", date: ilYA(60 * 24 * 20) },
    { id: "a2", citoyenId: "awa", structureId: "ramassage-plus", formuleId: "rp-demande", quartier: "Secteur 15", repere: "Mur ocre, face au moulin", paiement: "especes", statut: "en_attente", motifRefus: "", date: ilYA(45) },
    { id: "a3", citoyenId: "issouf", structureId: "ramassage-plus", formuleId: "rp-standard", quartier: "Secteur 16", repere: "Cour commune, 3 familles", paiement: "moov_money", statut: "en_attente", motifRefus: "", date: ilYA(130) },
  ];

  const collectes = [
    { id: "c1", abonnementId: "a1", citoyenId: "mariam", structureId: "ramassage-plus", volume: "moyen", statut: "planifiee", datePrevue: dans(20), date: ilYA(120) },
    { id: "c2", abonnementId: "a1", citoyenId: "mariam", structureId: "ramassage-plus", volume: "grand", statut: "faite", datePrevue: ilYA(60 * 24 * 3), date: ilYA(60 * 24 * 4) },
  ];

  return { comptes, structures, signalements, abonnements, collectes };
}

export function lireBase() {
  if (secours) return secours;
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return JSON.parse(brut);
  } catch {
    secours = null;
  }
  const base = graine();
  ecrireBase(base);
  return secours || base;
}

export function ecrireBase(base) {
  try {
    localStorage.setItem(CLE, JSON.stringify(base));
    secours = null;
  } catch {
    secours = base;
  }
  window.dispatchEvent(new Event("storage"));
}

export function comptePublic(compte) {
  const { password, ...reste } = compte;
  return reste;
}
