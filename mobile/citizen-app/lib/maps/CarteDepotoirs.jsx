import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { statutsSignalement, typesSignalement } from "../models/statuts.js";
import { dateCourte } from "../services/format.js";

const CENTRE_OUAGA = [12.3714, -1.5197];

export const couleursCarte = {
  verifie: "#D71920",
  transmis: "#D71920",
  pris_en_charge: "#FCD116",
  nettoye: "#00853F",
};

export default function CarteDepotoirs({ points, centre, moi, hauteur = 420, arrondi = 20, zoom = 14, controles = true }) {
  return (
    <MapContainer
      center={centre || CENTRE_OUAGA}
      zoom={zoom}
      zoomControl={controles}
      attributionControl={controles}
      style={{ height: hauteur, borderRadius: arrondi }}
    >
      <TileLayer
        attribution="&copy; contributeurs OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.position.lat, p.position.lng]}
          radius={p.taille === "grand" ? 13 : p.taille === "moyen" ? 10 : 8}
          pathOptions={{
            color: p.statut === "pris_en_charge" ? "#202B25" : "#FFFFFF",
            weight: p.statut === "pris_en_charge" ? 2 : 3,
            fillColor: couleursCarte[p.statut] || "#D71920",
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>{typesSignalement[p.type]}</strong>
            <br />
            {statutsSignalement[p.statut].label} · {p.quartier}
            <br />
            Signalé le {dateCourte(p.date)}
          </Popup>
        </CircleMarker>
      ))}
      {moi && (
        <CircleMarker
          center={moi}
          radius={9}
          pathOptions={{ color: "#FFFFFF", weight: 4, fillColor: "#202B25", fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
