import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { getMesCollectes } from "../services/collectes.js";
import { statutsAbonnement, statutsCollecte, volumes } from "../models/statuts.js";
import { dateCourte, dateHeure, prix } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import "./Ecran.css";

export default function MesDemandes() {
  const { user } = useAuth();
  const { state } = useLocation();
  const [abonnements, setAbonnements] = useState([]);
  const [collectes, setCollectes] = useState([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const [a, c] = await Promise.all([getMesAbonnements(user.id), getMesCollectes(user.id)]);
    setAbonnements(a);
    setCollectes(c);
    setChargement(false);
  }

  useActualisation(charger, user.id);

  return (
    <section className="ecran">
      <h1>Mes demandes</h1>

      {state?.envoye && <p className="message message-ok">Votre demande est envoyée à la structure.</p>}
      {state?.collecte && <p className="message message-ok">Votre demande de collecte est envoyée.</p>}

      <p className="section-titre">Abonnements</p>
      {chargement && <p className="message message-vide">Chargement...</p>}
      {!chargement && abonnements.length === 0 && (
        <p className="message message-vide">
          Aucune demande pour le moment. <Link to="/structures">Trouver une structure</Link>
        </p>
      )}
      <div className="liste">
        {abonnements.map((a) => (
          <article key={a.id} className="element">
            <div className="element-haut">
              <h3>{a.structureNom}</h3>
              <Badge statut={a.statut} liste={statutsAbonnement} />
            </div>
            <p className="element-meta">
              {a.formule.nom} · {prix(a.formule.prix)} par mois · demandé le {dateCourte(a.date)}
            </p>
            {a.statut === "refuse" && a.motifRefus && <p className="message message-erreur">{a.motifRefus}</p>}
            {a.statut === "accepte" && (
              <Link to={`/collecte?abonnement=${a.id}`} className="btn btn-primaire">
                Vider ma poubelle
              </Link>
            )}
          </article>
        ))}
      </div>

      <p className="section-titre">Collectes</p>
      {!chargement && collectes.length === 0 && <p className="message message-vide">Aucune collecte demandée.</p>}
      <div className="liste">
        {collectes.map((c) => (
          <article key={c.id} className="element">
            <div className="element-haut">
              <h3>{c.structureNom}</h3>
              <Badge statut={c.statut} liste={statutsCollecte} />
            </div>
            <p className="element-meta">
              Volume {volumes[c.volume].toLowerCase()} · demandé le {dateCourte(c.date)}
            </p>
            {c.statut === "planifiee" && <p className="message message-info">Passage prévu le {dateHeure(c.datePrevue)}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
