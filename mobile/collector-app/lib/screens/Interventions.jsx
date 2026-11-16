import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getSignalementsStructure, changerStatutSignalement } from "@citoyen/services/signalements.js";
import { statutsSignalement, typesSignalement } from "@citoyen/models/statuts.js";
import { dateCourte } from "@citoyen/services/format.js";
import Badge from "@citoyen/widgets/Badge.jsx";
import "@citoyen/screens/Ecran.css";

export default function Interventions() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  async function charger() {
    const liste = await getSignalementsStructure(user.id);
    setInterventions(liste.filter((s) => s.statut === "pris_en_charge" || s.statut === "nettoye"));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function terminer(intervention) {
    if (!window.confirm("Confirmer que le lieu est nettoyé ?")) return;
    try {
      await changerStatutSignalement(intervention.id, "nettoye");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const enCours = interventions.filter((i) => i.statut === "pris_en_charge");
  const terminees = interventions.filter((i) => i.statut === "nettoye");

  return (
    <section className="ecran">
      <Link to="/gestion" className="ecran-retour">
        <ArrowLeft size={18} /> Accueil
      </Link>
      <h1>Suivi des interventions</h1>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      <p className="section-titre">En cours ({enCours.length})</p>
      {!chargement && enCours.length === 0 && (
        <p className="message message-vide">
          Aucune intervention en cours. <Link to="/gestion/alertes">Voir les alertes</Link>
        </p>
      )}
      <div className="liste">
        {enCours.map((i) => (
          <article key={i.id} className="element">
            <div className="element-haut">
              <h3>{typesSignalement[i.type]}</h3>
              <Badge statut={i.statut} liste={statutsSignalement} />
            </div>
            <p className="element-meta">
              {i.quartier} · signalé le {dateCourte(i.date)}
            </p>
            <button type="button" className="btn btn-valider" onClick={() => terminer(i)}>
              Lieu nettoyé
            </button>
          </article>
        ))}
      </div>

      {terminees.length > 0 && <p className="section-titre">Terminées</p>}
      <div className="liste">
        {terminees.map((i) => (
          <article key={i.id} className="element">
            <div className="element-haut">
              <h3>{typesSignalement[i.type]}</h3>
              <Badge statut={i.statut} liste={statutsSignalement} />
            </div>
            <p className="element-meta">{i.quartier}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
