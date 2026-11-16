import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CircleCheck, Leaf } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesPoints } from "../services/signalements.js";
import { badges, prochainBadge, progression } from "../models/recompenses.js";
import "./Ecran.css";
import "./SignalementEnvoye.css";

const suite = [
  "La mairie vérifie la photo et la position.",
  "Le signalement est transmis à la structure du quartier.",
  "Vous suivez chaque étape jusqu'au nettoyage.",
];

export default function SignalementEnvoye() {
  const { user } = useAuth();
  const { state } = useLocation();
  const [score, setScore] = useState(null);
  const confirme = state?.confirme;

  async function charger() {
    setScore(await getMesPoints(user.id));
  }

  useActualisation(charger, user.id);

  const points = score ? score.points : 0;
  const prochain = prochainBadge(points);
  const obtenus = badges.filter((b) => points >= b.seuil);

  return (
    <section className="ecran envoye">
      <div className="envoye-entete">
        <CircleCheck size={40} strokeWidth={2} />
        <h1>{confirme ? "Confirmation enregistrée" : "Signalement envoyé"}</h1>
        <p className="ecran-sous-titre">
          {confirme
            ? "Ce dépotoir était déjà signalé. Votre confirmation aide la mairie à le traiter en priorité."
            : "Merci. Il partira automatiquement si le réseau est coupé."}
        </p>
      </div>

      {!confirme && (
        <div className="groupe">
          <p className="section-titre envoye-titre">Et ensuite</p>
          <ol className="envoye-suite">
            {suite.map((etape) => (
              <li key={etape}>{etape}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="groupe envoye-points">
        <p>
          <Leaf size={18} />
          <span>
            <strong>+{confirme ? 5 : 10} points</strong> dès que la mairie aura vérifié · {score ? score.solde : 0} disponibles
          </span>
        </p>
        {prochain && (
          <>
            <div className="envoye-barre">
              <i style={{ width: `${progression(points)}%` }}></i>
            </div>
            <small>
              {prochain.seuil - points} points avant le badge « {prochain.label} »
            </small>
          </>
        )}
        {obtenus.length > 0 && (
          <div className="etiquettes">
            {obtenus.map((b) => (
              <span key={b.cle} className="etiquette">
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="envoye-pied">
        <Link to={state?.id ? `/mes-signalements/${state.id}` : "/mes-signalements"} className="btn btn-primaire btn-large">
          Suivre mon signalement
        </Link>
        <Link to="/recompenses" className="btn btn-secondaire btn-large">
          Échanger mes points
        </Link>
        <Link to="/" className="btn btn-secondaire btn-large">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  );
}
