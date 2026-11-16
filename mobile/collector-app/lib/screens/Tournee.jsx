import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, Navigation, Check, ClipboardCheck, CalendarDays } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getTournee, terminerCollecte, reporterCollecte } from "@citoyen/services/collectes.js";
import { volumes } from "@citoyen/models/statuts.js";
import { lienWhatsapp } from "@citoyen/services/format.js";
import EtatVide from "@citoyen/widgets/EtatVide.jsx";
import CarteTournee from "../maps/CarteTournee.jsx";
import "@citoyen/screens/Ecran.css";
import "./Tournee.css";

function heure(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function Tournee() {
  const { user } = useAuth();
  const [tournee, setTournee] = useState({ points: [], faites: [] });
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [annonce, setAnnonce] = useState("");
  const [erreur, setErreur] = useState("");

  async function charger() {
    setTournee(await getTournee(user.id));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function agir(action, texte) {
    setEnvoi(true);
    try {
      await action();
      setErreur("");
      setAnnonce(texte);
      setTimeout(() => setAnnonce(""), 2200);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const faites = [...tournee.faites].sort((a, b) => a.datePrevue.localeCompare(b.datePrevue));
  const arrets = [
    ...faites.map((c, i) => ({ ...c, numero: i + 1, etat: "fait" })),
    ...tournee.points.map((c, i) => ({ ...c, numero: faites.length + i + 1, etat: i === 0 ? "courant" : "suivant" })),
  ];
  const courant = tournee.points[0];
  const total = arrets.length;

  return (
    <section className="tournee">
      <div className="tournee-fond">
        <CarteTournee arrets={arrets} />
      </div>

      <header className="tournee-entete">
        <Link to="/gestion" className="bouton-retour tournee-bouton">
          <ArrowLeft size={18} /> Retour
        </Link>
        <div>
          <small>{courant ? courant.quartier : "Tournée du jour"}</small>
          <strong>{courant ? `Point ${faites.length + 1} sur ${total}` : `${faites.length} passage(s) faits`}</strong>
        </div>
      </header>

      {annonce && (
        <p className="tournee-annonce" role="status">
          <Check size={18} strokeWidth={3} /> {annonce}
        </p>
      )}

      <div className="tournee-panneau">
        <span className="poignee" aria-hidden="true"></span>

        {chargement && <p className="message message-vide">Chargement...</p>}

        {!chargement && !courant && (
          <EtatVide
            icone={total ? ClipboardCheck : CalendarDays}
            titre={total ? "Tournée terminée" : "Aucun passage aujourd'hui"}
            texte={total ? `${faites.length} passage(s) enregistré(s) aujourd'hui.` : "Planifiez les collectes demandées par vos abonnés."}
          >
            <Link to="/gestion/collectes" className="btn btn-primaire">
              Voir le planning
            </Link>
          </EtatVide>
        )}

        {courant && (
          <>
            <div className="tournee-arret">
              <div>
                <h2>{courant.citoyenNom}</h2>
                <p className="element-meta">{courant.repere || courant.quartier}</p>
              </div>
              <span className="badge statut-info">{heure(courant.datePrevue)}</span>
            </div>
            <div className="etiquettes">
              <span className="etiquette">Volume {volumes[courant.volume].toLowerCase()}</span>
              <span className="etiquette">{courant.quartier}</span>
            </div>

            <div className="tournee-actions">
              <a href={`tel:${courant.citoyenTelephone}`} className="tournee-action">
                <Phone size={20} /> Appeler
              </a>
              <a href={lienWhatsapp(courant.citoyenTelephone)} target="_blank" rel="noreferrer noopener" className="tournee-action">
                <MessageCircle size={20} /> WhatsApp
              </a>
              {courant.position && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${courant.position.lat},${courant.position.lng}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="tournee-action"
                >
                  <Navigation size={20} /> Itinéraire
                </a>
              )}
            </div>

            {erreur && <p className="message message-erreur">{erreur}</p>}

            <button
              type="button"
              className="tournee-faite"
              disabled={envoi}
              onClick={() => agir(() => terminerCollecte(courant.id), "Collecte enregistrée")}
            >
              <Check size={24} strokeWidth={3} />
              Collecte faite
            </button>
            <button
              type="button"
              className="tournee-reporter"
              disabled={envoi}
              onClick={() => agir(() => reporterCollecte(courant.id), "Reporté à demain matin")}
            >
              Absent · reporter à demain
            </button>
          </>
        )}
      </div>
    </section>
  );
}
