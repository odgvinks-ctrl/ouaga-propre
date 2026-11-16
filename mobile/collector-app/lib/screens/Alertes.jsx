import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getSignalementsStructure, changerStatutSignalement } from "@citoyen/services/signalements.js";
import { typesSignalement, volumes } from "@citoyen/models/statuts.js";
import { dateCourte } from "@citoyen/services/format.js";
import "@citoyen/screens/Ecran.css";

function lienCarte(position) {
  return `https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lng}#map=18/${position.lat}/${position.lng}`;
}

export default function Alertes() {
  const { user } = useAuth();
  const [alertes, setAlertes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  async function charger() {
    const liste = await getSignalementsStructure(user.id);
    setAlertes(liste.filter((s) => s.statut === "transmis"));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function prendreEnCharge(alerte) {
    try {
      await changerStatutSignalement(alerte.id, "pris_en_charge");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <section className="ecran">
      <div>
        <h1>Alertes de mon secteur</h1>
        <p className="ecran-sous-titre">Signalements vérifiés par l'administration et transmis à votre structure.</p>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}
      {!chargement && alertes.length === 0 && <p className="message message-vide">Aucune alerte pour le moment.</p>}

      <div className="liste">
        {alertes.map((a) => (
          <article key={a.id} className="element">
            <div className="element-haut">
              <h3>{typesSignalement[a.type]}</h3>
              <span className="badge statut-attente">{volumes[a.taille]}</span>
            </div>
            <p className="element-meta">
              {a.quartier} · signalé le {dateCourte(a.date)}
            </p>
            {a.description && <p className="element-meta">{a.description}</p>}
            {a.position && (
              <a href={lienCarte(a.position)} target="_blank" rel="noreferrer noopener" className="element-meta">
                <MapPin size={14} /> Voir sur la carte
              </a>
            )}
            <button type="button" className="btn btn-primaire" onClick={() => prendreEnCharge(a)}>
              Prendre en charge
            </button>
          </article>
        ))}
      </div>

      <Link to="/gestion/interventions" className="btn btn-secondaire btn-large">
        Voir mes interventions en cours
      </Link>
    </section>
  );
}
