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

export function telechargerGeoJson(nomFichier, entites, informations = {}) {
  const contenu = {
    type: "FeatureCollection",
    name: nomFichier.replace(/\.geojson$/, ""),
    license: "ODbL-1.0",
    attribution: "FASO NEERE, Mairie de Ouagadougou. Fond de carte © contributeurs OpenStreetMap.",
    generated: new Date().toISOString(),
    ...informations,
    features: entites
      .filter((e) => e.position && Number.isFinite(e.position.lat) && Number.isFinite(e.position.lng))
      .map((e) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(e.position.lng.toFixed(5)), Number(e.position.lat.toFixed(5))] },
        properties: e.proprietes,
      })),
  };
  const blob = new Blob([JSON.stringify(contenu, null, 2)], { type: "application/geo+json" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}
