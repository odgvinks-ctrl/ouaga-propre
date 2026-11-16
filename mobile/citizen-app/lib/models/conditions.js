export const COMMISSION = 10;

export const VERSION_CONDITIONS = "2026-11";

export const conditionsPartenariat = [
  {
    titre: "Autorisation de la mairie",
    texte:
      "Seules les structures qui détiennent une autorisation de pré-collecte délivrée par la mairie de Ouagadougou peuvent proposer des abonnements sur FASO NEERE. La structure s'engage à prévenir l'administration si cette autorisation est suspendue ou retirée.",
  },
  {
    titre: `Commission de ${COMMISSION} %`,
    texte: `FASO NEERE prélève ${COMMISSION} % du montant de chaque transaction effectuée à travers l'application : abonnements, collectes à la demande et tout autre paiement d'un citoyen à la structure. Les 90 % restants reviennent à la structure.`,
  },
  {
    titre: "Paiements",
    texte:
      "Les paiements par Orange Money ou Moov Money passent par FASO NEERE, qui reverse la part de la structure. Pour les paiements en espèces enregistrés dans l'application, la commission est facturée en fin de mois.",
  },
  {
    titre: "Qualité du service",
    texte:
      "La structure s'engage à respecter les passages annoncés dans ses formules et à traiter les signalements qui lui sont confiés. L'administration peut suspendre un compte en cas de plaintes répétées ou de fausses informations.",
  },
  {
    titre: "Données personnelles",
    texte:
      "Les noms, numéros et adresses des abonnés servent uniquement à organiser la collecte. La structure ne doit ni les revendre, ni les partager, ni les utiliser à d'autres fins. Les documents envoyés à l'inscription ne sont vus que par l'administration.",
  },
  {
    titre: "Résiliation",
    texte:
      "La structure peut quitter FASO NEERE à tout moment en prévenant ses abonnés un mois à l'avance. Les commissions déjà dues restent à payer.",
  },
];
