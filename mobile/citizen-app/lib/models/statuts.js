export const statutsSignalement = {
  a_verifier: { label: "En vérification", classe: "statut-attente" },
  verifie: { label: "Vérifié", classe: "statut-ok" },
  transmis: { label: "Transmis à une structure", classe: "statut-info" },
  pris_en_charge: { label: "Pris en charge", classe: "statut-info" },
  nettoye: { label: "Nettoyé", classe: "statut-ok" },
  rejete: { label: "Rejeté", classe: "statut-refus" },
};

export const statutsAbonnement = {
  en_attente: { label: "En attente", classe: "statut-attente" },
  accepte: { label: "Accepté", classe: "statut-ok" },
  refuse: { label: "Refusé", classe: "statut-refus" },
};

export const statutsCollecte = {
  demandee: { label: "Demandée", classe: "statut-attente" },
  planifiee: { label: "Planifiée", classe: "statut-info" },
  faite: { label: "Faite", classe: "statut-ok" },
  annulee: { label: "Annulée", classe: "statut-refus" },
};

export const typesSignalement = {
  depotoir: "Dépotoir sauvage",
  caniveau: "Caniveau bouché",
};

export const typesStructure = ["GIE", "Entreprise", "Association"];

export const moyensPaiement = {
  orange_money: "Orange Money",
  moov_money: "Moov Money",
  especes: "Espèces au passage",
};

export const volumes = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
};

export const statutsVehicule = {
  disponible: { label: "Disponible", classe: "statut-ok" },
  en_tournee: { label: "En tournée", classe: "statut-info" },
  en_panne: { label: "En panne", classe: "statut-refus" },
};

export const typesVehicule = ["Tricycle", "Charrette", "Moto-benne", "Camion benne"];

export const rolesEquipe = ["Chef d'équipe", "Pré-collecteur", "Chauffeur", "Agent de curage"];
