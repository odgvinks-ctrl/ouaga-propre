import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesSignalements } from "../services/signalements.js";
import { statutsSignalement, typesSignalement, volumes } from "../models/statuts.js";
import { dateCourte } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import "./Ecran.css";

export default function MesEnvois() {
  const { user } = useAuth();
  const { state } = useLocation();
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    setSignalements(await getMesSignalements(user.id));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  return (
    <section className="ecran">
      <div>
        <h1>Mes envois</h1>
        <p className="ecran-sous-titre">Suivez vos signalements de dépotoirs et de caniveaux.</p>
      </div>

      {state?.envoye && <p className="message message-ok">Merci, votre signalement est envoyé. L'administration va le vérifier.</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}
      {!chargement && signalements.length === 0 && <p className="message message-vide">Vous n'avez encore rien signalé.</p>}

      <div className="liste">
        {signalements.map((s) => (
          <article key={s.id} className="element">
            <div className="element-haut">
              <h3>{typesSignalement[s.type]}</h3>
              <Badge statut={s.statut} liste={statutsSignalement} />
            </div>
            <p className="element-meta">
              {s.quartier} · {volumes[s.taille]} · {dateCourte(s.date)}
            </p>
            {s.description && <p className="element-meta">{s.description}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
