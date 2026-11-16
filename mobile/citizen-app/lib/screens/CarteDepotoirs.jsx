import { useEffect, useState } from "react";
import { getDepotoirsCarte } from "../services/signalements.js";
import { typesSignalement } from "../models/statuts.js";
import CarteDepotoirs from "../maps/CarteDepotoirs.jsx";
import "./Ecran.css";

const legende = [
  { couleur: "#D71920", label: "À nettoyer" },
  { couleur: "#FCD116", label: "Pris en charge" },
  { couleur: "#00853F", label: "Nettoyé" },
  { couleur: "#202B25", label: "Vous" },
];

export default function CarteDepotoirsEcran() {
  const [points, setPoints] = useState([]);
  const [type, setType] = useState("");
  const [position, setPosition] = useState(null);

  useEffect(() => {
    getDepotoirsCarte().then(setPoints);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setPosition([p.coords.latitude, p.coords.longitude]),
        () => {},
        { timeout: 10000 }
      );
    }
  }, []);

  const visibles = points.filter((p) => !type || p.type === type);

  return (
    <section className="ecran">
      <div>
        <h1>Carte des dépotoirs</h1>
        <p className="ecran-sous-titre">Seuls les signalements vérifiés par l'administration apparaissent.</p>
      </div>

      <div className="filtres">
        <button type="button" className={type === "" ? "actif" : ""} onClick={() => setType("")}>
          Tout · {points.length}
        </button>
        {Object.entries(typesSignalement).map(([cle, label]) => (
          <button key={cle} type="button" className={type === cle ? "actif" : ""} onClick={() => setType(cle)}>
            {label} · {points.filter((p) => p.type === cle).length}
          </button>
        ))}
      </div>

      <CarteDepotoirs points={visibles} centre={position} moi={position} arrondi={12} hauteur="58vh" />

      <div className="etiquettes">
        {legende.map((l) => (
          <span key={l.label} className="etiquette">
            <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: l.couleur, marginRight: 6 }}></i>
            {l.label}
          </span>
        ))}
      </div>
      <p className="champ-aide">Le fond de carte a besoin du réseau. Les points restent enregistrés sur le téléphone.</p>
    </section>
  );
}
