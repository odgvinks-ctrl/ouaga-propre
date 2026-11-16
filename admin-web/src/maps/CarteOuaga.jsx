import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CENTRE_OUAGA = [12.3714, -1.5197];

function Clic({ onClic }) {
  useMapEvents({
    click(e) {
      onClic({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Cadrer({ positions }) {
  const map = useMap();
  const cle = positions.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [40, 40], maxZoom: 15 });
    if (positions.length === 1) map.setView(positions[0], 15);
  }, [cle]);

  return null;
}

export default function CarteOuaga({ hauteur = 560, cadrage = [], onClic, children }) {
  return (
    <MapContainer center={CENTRE_OUAGA} zoom={13} style={{ height: hauteur, borderRadius: 12, zIndex: 0 }}>
      <TileLayer attribution="&copy; contributeurs OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {cadrage.length > 0 && <Cadrer positions={cadrage} />}
      {onClic && <Clic onClic={onClic} />}
      {children}
    </MapContainer>
  );
}
