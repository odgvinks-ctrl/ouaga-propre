import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CENTRE_OUAGA = [12.3714, -1.5197];

export default function CarteOuaga({ hauteur = 560, children }) {
  return (
    <MapContainer center={CENTRE_OUAGA} zoom={12} style={{ height: hauteur, borderRadius: 12 }}>
      <TileLayer
        attribution="&copy; contributeurs OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
