function cellule(valeur) {
  const texte = valeur === null || valeur === undefined ? "" : String(valeur);
  return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export function telechargerCsv(nomFichier, colonnes, lignes) {
  const entete = colonnes.map((c) => cellule(c.label)).join(";");
  const corps = lignes.map((ligne) => colonnes.map((c) => cellule(c.valeur(ligne))).join(";"));
  const contenu = "﻿" + [entete, ...corps].join("\r\n");
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}
