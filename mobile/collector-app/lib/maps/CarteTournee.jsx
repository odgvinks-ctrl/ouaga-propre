import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CENTRE_OUAGA = [12.3714, -1.5197];

function icone(numero, etat) {
  const taille = etat === "courant" ? 44 : 30;
  return L.divIcon({
    className: "",
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
    html: `<span class="tournee-repere ${etat}">${numero}</span>`,
  });
}

function Cadrer({ positions }) {
  const map = useMap();
  const cle = positions.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [60, 60] });
    if (positions.length === 1) map.setView(positions[0], 16);
  }, [cle]);

  return null;
}

export default function CarteTournee({ arrets }) {
  const places = arrets.filter((a) => a.position);
  const positions = places.map((a) => [a.position.lat, a.position.lng]);
  const faites = places.filter((a) => a.etat === "fait").map((a) => [a.position.lat, a.position.lng]);
  const restantes = places.filter((a) => a.etat !== "fait").map((a) => [a.position.lat, a.position.lng]);
  const jonction = faites.length && restantes.length ? [faites[faites.length - 1], ...restantes] : restantes;

  return (
    <MapContainer center={CENTRE_OUAGA} zoom={14} zoomControl={false} attributionControl={false} style={{ position: "absolute", inset: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Cadrer positions={positions} />
      {faites.length > 1 && <Polyline positions={faites} pathOptions={{ color: "#00853F", weight: 6, lineCap: "round" }} />}
      {jonction.length > 1 && (
        <Polyline positions={jonction} pathOptions={{ color: "#4F5B54", weight: 5, dashArray: "2 12", lineCap: "round" }} />
      )}
      {places.map((a) => (
        <Marker key={a.id} position={[a.position.lat, a.position.lng]} icon={icone(a.numero, a.etat)} />
      ))}
    </MapContainer>
  );
}
