export const libellesEnregistrement = {
  GIE: "Numéro d'immatriculation du GIE",
  Entreprise: "Numéro RCCM",
  Association: "Numéro du récépissé de déclaration",
};

export function piecesRequises(type) {
  return [
    { cle: "identite", label: "Pièce d'identité du responsable", aide: "CNIB ou passeport, recto et verso", obligatoire: true },
    {
      cle: "legal",
      label: type === "Entreprise" ? "Extrait RCCM" : type === "Association" ? "Récépissé de déclaration de l'association" : "Attestation d'immatriculation du GIE",
      aide: "Au nom de la structure",
      obligatoire: true,
    },
    { cle: "ifu", label: "Attestation IFU", aide: "Identifiant financier unique", obligatoire: type === "Entreprise" },
    {
      cle: "autorisation",
      label: "Autorisation de pré-collecte de la mairie",
      aide: "Document délivré par la mairie qui vous autorise à collecter les ordures chez les habitants",
      obligatoire: true,
    },
  ];
}
