import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Clock, Check, Truck, MessageCircle, Users } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getSignalement } from "../services/signalements.js";
import { demarrerConversation } from "../services/messages.js";
import { statutsSignalement, typesSignalement, volumes } from "../models/statuts.js";
import { etapesSignalement, rangEtape } from "../models/recompenses.js";
import { dateCourte, dateHeure, initiales } from "../services/format.js";
import "./Ecran.css";
import "./SuiviSignalement.css";

export default function SuiviSignalement() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signalement, setSignalement] = useState(null);
  const [erreur, setErreur] = useState("");

  async function charger() {
    try {
      setSignalement(await getSignalement(id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  useActualisation(charger, id);

  async function ecrire() {
    const conversationId = await demarrerConversation(user.id, signalement.structureId);
    navigate(`/messagerie/${conversationId}`);
  }

  if (erreur) {
    return (
      <section className="ecran">
        <p className="message message-erreur">{erreur}</p>
        <Link to="/mes-signalements" className="ecran-retour">
          <ArrowLeft size={18} /> Mes signalements
        </Link>
      </section>
    );
  }

  if (!signalement) {
    return (
      <section className="ecran">
        <p className="message message-vide">Chargement...</p>
      </section>
    );
  }

  const rejete = signalement.statut === "rejete";
  const rang = rangEtape(signalement.statut);
  const nettoye = signalement.statut === "nettoye";

  function dateEtape(statut) {
    const trace = signalement.historique.find((h) => h.statut === statut);
    return trace ? dateHeure(trace.date) : "";
  }

  return (
    <section className="ecran">
      <div>
        <span className="element-meta">Signalé le {dateCourte(signalement.date)}</span>
        <h1 className="suivi-titre">
          {typesSignalement[signalement.type]} · {signalement.quartier}
        </h1>
      </div>

      <div className="suivi-photos">
        <div className="suivi-photo avant">
          {/^(data:|https?:)/.test(signalement.photo) ? (
            <img src={signalement.photo} alt="Le lieu avant le nettoyage" />
          ) : (
            <>
              <Camera size={30} />
              <small>{signalement.photo}</small>
            </>
          )}
          <span>Avant</span>
        </div>
        <div className={nettoye ? "suivi-photo apres fait" : "suivi-photo apres"}>
          {nettoye && /^(data:|https?:)/.test(signalement.photoApres) ? (
            <img src={signalement.photoApres} alt="Le lieu après le nettoyage" />
          ) : (
            <>
              {nettoye ? <Check size={30} /> : <Clock size={28} />}
              <small>{nettoye ? "Lieu nettoyé" : "Photo après nettoyage"}</small>
            </>
          )}
          <span>Après</span>
        </div>
      </div>

      {rejete ? (
        <p className="message message-erreur">
          Ce signalement n'a pas été retenu par la mairie{signalement.motifRejet ? ` : ${signalement.motifRejet}.` : "."}
        </p>
      ) : (
        <ol className="suivi-frise">
          {etapesSignalement.map((e, i) => {
            const fait = i < rang || nettoye;
            const courant = i === rang && !nettoye;
            const label = e.statut === "transmis" && signalement.structureNom ? `Transmis à ${signalement.structureNom}` : e.label;
            return (
              <li key={e.statut} className={fait ? "fait" : courant ? "courant" : ""}>
                <span className="suivi-point">
                  {fait && <Check size={15} strokeWidth={3} />}
                  {courant && (e.statut === "pris_en_charge" ? <Truck size={15} /> : <Clock size={15} />)}
                </span>
                <div>
                  <strong>{label}</strong>
                  <small>{dateEtape(e.statut) || (courant ? "En cours" : fait ? "" : "À venir")}</small>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="etiquettes">
        <span className="etiquette">Taille : {volumes[signalement.taille]}</span>
        {signalement.confirmations.length > 0 && (
          <span className="etiquette">
            <Users size={13} /> Confirmé par {signalement.confirmations.length} voisin(s)
          </span>
        )}
        <span className={`badge ${statutsSignalement[signalement.statut].classe}`}>{statutsSignalement[signalement.statut].label}</span>
      </div>
      {signalement.description && <p className="element-meta">{signalement.description}</p>}

      {signalement.structureId && user && (
        <div className="element suivi-structure">
          <span className="suivi-logo">{initiales(signalement.structureNom)}</span>
          <div>
            <strong>{signalement.structureNom}</strong>
            <span className="element-meta">Structure chargée du nettoyage</span>
          </div>
          <button type="button" className="btn btn-secondaire" onClick={ecrire}>
            <MessageCircle size={18} /> Écrire
          </button>
        </div>
      )}
    </section>
  );
}
