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
    { cle: "agrement", label: "Autorisation ou convention avec la mairie", aide: "Si vous en avez une", obligatoire: false },
  ];
}
