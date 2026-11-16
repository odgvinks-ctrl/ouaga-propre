import L from "leaflet";

export function iconePoint(couleur, selectionne = false) {
  const taille = selectionne ? 22 : 16;
  return L.divIcon({
    className: "",
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
    html: `<span style="display:block;width:${taille}px;height:${taille}px;background:${couleur};border:2px solid #202B25;border-radius:3px;box-shadow:0 1px 3px rgba(32,43,37,.35)"></span>`,
  });
}
