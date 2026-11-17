import { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { listerZones, simulationComplete } from "../services/simulation.js";

export default function ChoixZone({ valeur, onChoisir }) {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    if (!simulationComplete) return;
    listerZones()
      .then(setZones)
      .catch(() => setZones([]));
  }, []);

  if (zones.length === 0) return null;

  const courante = zones.find((z) => z.id === valeur) || zones[0];

  return (
    <label className="champ choix-zone">
      <span>
        <MapPinned size={16} /> Zone étudiée
      </span>
      <select
        value={courante.id}
        onChange={(e) => {
          const zone = zones.find((z) => z.id === e.target.value);
          if (zone) onChoisir(zone);
        }}
      >
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.nom} · {z.valeurs.menages.toLocaleString("fr-FR")} ménages
          </option>
        ))}
      </select>
    </label>
  );
}
