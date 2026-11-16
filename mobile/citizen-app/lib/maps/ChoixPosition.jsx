import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CENTRE_OUAGA = [12.3714, -1.5197];

function Suivi({ onDeplacement }) {
  const map = useMapEvents({
    moveend() {
      const c = map.getCenter();
      onDeplacement({ lat: c.lat, lng: c.lng });
    },
  });

  useEffect(() => {
    const c = map.getCenter();
    onDeplacement({ lat: c.lat, lng: c.lng });
  }, [map]);

  return null;
}

function Recentrer({ cible }) {
  const map = useMap();

  useEffect(() => {
    if (cible) map.setView([cible.lat, cible.lng], 17);
  }, [cible, map]);

  return null;
}

export default function ChoixPosition({ cible, doublons, onDeplacement }) {
  return (
    <MapContainer
      center={cible ? [cible.lat, cible.lng] : CENTRE_OUAGA}
      zoom={cible ? 17 : 14}
      zoomControl={false}
      attributionControl={false}
      style={{ position: "absolute", inset: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recentrer cible={cible} />
      <Suivi onDeplacement={onDeplacement} />
      {doublons.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.position.lat, d.position.lng]}
          radius={11}
          pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: "#FCD116", fillOpacity: 1 }}
        />
      ))}
    </MapContainer>
  );
}
