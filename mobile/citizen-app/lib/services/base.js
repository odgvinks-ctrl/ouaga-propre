const CLE = "ouaga-propre-base-v5";
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
    { ...compte("admin", "Administration FASO NEERE", "70000000", "admin", "actif", ""), password: "admin1234" },
    compte("mariam", "Mariam Ouédraogo", "70112233", "citoyen", "actif", "Paspanga"),
    compte("awa", "Awa Kaboré", "70445566", "citoyen", "actif", "Paspanga"),
    compte("issouf", "Issouf Sawadogo", "76554433", "citoyen", "actif", "Dapoya"),
    compte("fatim", "Fatimata Kaboré", "70998877", "citoyen", "actif", "Paspanga"),
    compte("moussa", "Moussa Traoré", "78112244", "citoyen", "actif", "Koulouba"),
    compte("ramassage-plus", "GIE Ramassage Plus", "70223344", "structure", "actif", "Paspanga"),
    compte("rues-propres", "Association Rues Propres", "71889900", "structure", "actif", "Tanghin"),
    compte("collecte-express", "Collecte Express SARL", "75667788", "structure", "actif", "Gounghin"),
    compte("nouvelle-aube", "GIE Nouvelle Aube", "78990011", "structure", "en_attente", "Wemtenga"),
  ];

  const structures = [
    {
      id: "ramassage-plus",
      type: "GIE",
      responsable: "Boukary Zongo",
      whatsapp: "70223344",
      numeroEnregistrement: "GIE-OUA-2021-0148",
      piece: "attestation-gie.pdf",
      numeroCnib: "B10458231",
      ifu: "00045821K",
      pieces: { identite: "cnib-boukary-zongo.jpg", legal: "attestation-gie.pdf", ifu: "attestation-ifu.pdf", agrement: "convention-mairie.pdf" },
      description: "Pré-collecte des ordures ménagères en tricycle, 6 jours sur 7.",
      quartiers: ["Paspanga", "Dapoya", "Koulouba"],
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
      numeroCnib: "B07714502",
      ifu: "",
      pieces: { identite: "cnib-salimata-ilboudo.jpg", legal: "recepisse-association.pdf", ifu: "", agrement: "" },
      description: "Association de femmes du quartier : collecte et curage des caniveaux.",
      quartiers: ["Tanghin", "Nonsin"],
      formules: [{ id: "rpr-standard", nom: "Standard", prix: 1500, frequence: "2 passages par semaine" }],
    },
    {
      id: "collecte-express",
      type: "Entreprise",
      responsable: "Salif Compaoré",
      whatsapp: "75667788",
      numeroEnregistrement: "BF-OUA-2020-B-1123",
      piece: "rccm.pdf",
      numeroCnib: "B11290874",
      ifu: "00067215T",
      pieces: { identite: "cnib-salif-compaore.jpg", legal: "rccm.pdf", ifu: "attestation-ifu.pdf", agrement: "" },
      description: "Collecte par camion benne pour ménages, cours communes et commerces.",
      quartiers: ["Gounghin", "Paspanga", "Dassasgho"],
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
      piece: "attestation-gie.jpg",
      numeroCnib: "B12844016",
      ifu: "",
      pieces: { identite: "cnib-rasmata-nikiema.jpg", legal: "attestation-gie.jpg", ifu: "", agrement: "" },
      description: "",
      quartiers: ["Wemtenga"],
      formules: [],
    },
  ];

  const signalements = [
    { id: "s1", auteurId: "mariam", type: "depotoir", taille: "moyen", description: "Tas d'ordures derrière le marché.", quartier: "Paspanga", position: { lat: 12.3721, lng: -1.5152, precision: 12 }, photo: "photo-s1.jpg", statut: "transmis", structureId: "ramassage-plus", date: ilYA(60 * 26) },
    { id: "s2", auteurId: "mariam", type: "caniveau", taille: "grand", description: "Caniveau bouché devant l'école.", quartier: "Paspanga", position: { lat: 12.3709, lng: -1.5168, precision: 9 }, photo: "photo-s2.jpg", statut: "a_verifier", structureId: null, date: ilYA(90) },
    { id: "s3", auteurId: "awa", type: "depotoir", taille: "grand", description: "Dépôt de gravats et plastiques.", quartier: "Dapoya", position: { lat: 12.3655, lng: -1.5101, precision: 15 }, photo: "photo-s3.jpg", statut: "pris_en_charge", structureId: "ramassage-plus", date: ilYA(60 * 50) },
    { id: "s4", auteurId: "issouf", type: "caniveau", taille: "moyen", description: "Eau stagnante, odeur forte.", quartier: "Tanghin", position: { lat: 12.3588, lng: -1.4987, precision: 20 }, photo: "photo-s4.jpg", statut: "transmis", structureId: "rues-propres", date: ilYA(60 * 8) },
    { id: "s5", auteurId: "mariam", type: "depotoir", taille: "petit", description: "", quartier: "Paspanga", position: { lat: 12.3732, lng: -1.5141, precision: 10 }, photo: "photo-s5.jpg", statut: "nettoye", structureId: "ramassage-plus", date: ilYA(60 * 24 * 6) },
  ];

  const etapes = ["a_verifier", "verifie", "transmis", "pris_en_charge", "nettoye"];
  signalements.forEach((s) => {
    const depart = new Date(s.date).getTime();
    s.historique = etapes
      .slice(0, etapes.indexOf(s.statut) + 1)
      .map((statut, i) => ({ statut, date: new Date(depart + i * 2 * 3600000).toISOString() }));
    s.confirmations = [];
  });

  const abonnements = [
    { id: "a1", citoyenId: "mariam", structureId: "ramassage-plus", formuleId: "rp-standard", quartier: "Paspanga", repere: "Portail bleu après la boutique", position: { lat: 12.3718, lng: -1.5160 }, paiement: "orange_money", statut: "accepte", motifRefus: "", date: ilYA(60 * 24 * 20) },
    { id: "a2", citoyenId: "awa", structureId: "ramassage-plus", formuleId: "rp-demande", quartier: "Paspanga", repere: "Mur ocre, face au moulin", paiement: "especes", statut: "en_attente", motifRefus: "", date: ilYA(45) },
    { id: "a3", citoyenId: "issouf", structureId: "ramassage-plus", formuleId: "rp-standard", quartier: "Dapoya", repere: "Cour commune, 3 familles", paiement: "moov_money", statut: "en_attente", motifRefus: "", date: ilYA(130) },
    { id: "a4", citoyenId: "fatim", structureId: "ramassage-plus", formuleId: "rp-standard", quartier: "Paspanga", repere: "Porte verte près de la mosquée", position: { lat: 12.3735, lng: -1.5138 }, paiement: "orange_money", statut: "accepte", motifRefus: "", date: ilYA(60 * 24 * 40) },
    { id: "a5", citoyenId: "moussa", structureId: "ramassage-plus", formuleId: "rp-demande", quartier: "Koulouba", repere: "Cour avec le grand neem", position: { lat: 12.3692, lng: -1.5121 }, paiement: "especes", statut: "accepte", motifRefus: "", date: ilYA(60 * 24 * 15) },
  ];

  const passe = (jours, heure) => {
    const d = new Date(Date.now() - jours * 86400000);
    d.setHours(heure, 0, 0, 0);
    return d.toISOString();
  };

  const faite = (id, abonnementId, citoyenId, jours, heure) => ({
    id,
    abonnementId,
    citoyenId,
    structureId: "ramassage-plus",
    volume: "moyen",
    statut: "faite",
    datePrevue: passe(jours, heure),
    date: passe(jours + 1, 18),
  });

  const collectes = [
    { id: "c1", abonnementId: "a1", citoyenId: "mariam", structureId: "ramassage-plus", volume: "moyen", statut: "planifiee", datePrevue: dans(2), date: ilYA(120) },
    { id: "c3", abonnementId: "a4", citoyenId: "fatim", structureId: "ramassage-plus", volume: "grand", statut: "planifiee", datePrevue: dans(1), date: ilYA(300) },
    { id: "c4", abonnementId: "a5", citoyenId: "moussa", structureId: "ramassage-plus", volume: "petit", statut: "planifiee", datePrevue: dans(3), date: ilYA(200) },
    { id: "c2", abonnementId: "a1", citoyenId: "mariam", structureId: "ramassage-plus", volume: "grand", statut: "faite", datePrevue: ilYA(60 * 24 * 3), date: ilYA(60 * 24 * 4) },
    faite("c5", "a4", "fatim", 1, 9),
    faite("c6", "a5", "moussa", 1, 11),
    faite("c7", "a4", "fatim", 2, 10),
    faite("c8", "a1", "mariam", 4, 9),
    faite("c9", "a5", "moussa", 5, 8),
    faite("c10", "a4", "fatim", 5, 15),
    faite("c11", "a1", "mariam", 6, 10),
    faite("c12", "a5", "moussa", 9, 9),
    faite("c13", "a4", "fatim", 12, 10),
  ];

  const conversations = [
    {
      id: "mariam__ramassage-plus",
      citoyenId: "mariam",
      structureId: "ramassage-plus",
      messages: [
        { id: "m1", auteurId: "mariam", texte: "Bonjour, pouvez-vous passer avant 10 h demain ?", date: ilYA(180) },
        { id: "m2", auteurId: "ramassage-plus", texte: "Bonjour Madame, oui. Boukary passera vers 9 h.", date: ilYA(170) },
      ],
      lectures: { mariam: ilYA(170), "ramassage-plus": ilYA(170) },
    },
    {
      id: "awa__ramassage-plus",
      citoyenId: "awa",
      structureId: "ramassage-plus",
      messages: [{ id: "m3", auteurId: "awa", texte: "Bonjour, je paierai en espèces au premier passage, c'est possible ?", date: ilYA(40) }],
      lectures: { awa: ilYA(40) },
    },
  ];

  const vehicules = [
    { id: "v1", structureId: "ramassage-plus", nom: "Tricycle 1", type: "Tricycle", immatriculation: "11 KL 2345", capacite: "1,5 m³", statut: "disponible" },
    { id: "v2", structureId: "ramassage-plus", nom: "Tricycle 2", type: "Tricycle", immatriculation: "11 KL 6789", capacite: "1,5 m³", statut: "en_panne" },
    { id: "v3", structureId: "ramassage-plus", nom: "Charrette", type: "Charrette", immatriculation: "", capacite: "0,5 m³", statut: "en_tournee" },
    { id: "v4", structureId: "collecte-express", nom: "Camion benne", type: "Camion benne", immatriculation: "11 MN 4521", capacite: "8 t", statut: "disponible" },
  ];

  const equipes = [
    { id: "e1", structureId: "ramassage-plus", nom: "Boukary Zongo", role: "Chef d'équipe", telephone: "70223345", vehiculeId: "v1" },
    { id: "e2", structureId: "ramassage-plus", nom: "Adama Ouédraogo", role: "Pré-collecteur", telephone: "76112233", vehiculeId: "v1" },
    { id: "e3", structureId: "ramassage-plus", nom: "Ali Sawadogo", role: "Pré-collecteur", telephone: "66778899", vehiculeId: "v3" },
    { id: "e4", structureId: "collecte-express", nom: "Salif Compaoré", role: "Chauffeur", telephone: "75667789", vehiculeId: "v4" },
  ];

  return { comptes, structures, signalements, abonnements, collectes, conversations, vehicules, equipes, echanges: [] };
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
