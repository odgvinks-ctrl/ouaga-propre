import { useState } from "react";
import { Phone } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getDemandesStructure, repondreDemande } from "@citoyen/services/abonnements.js";
import { statutsAbonnement, moyensPaiement } from "@citoyen/models/statuts.js";
import { dateCourte, prix } from "@citoyen/services/format.js";
import Badge from "@citoyen/widgets/Badge.jsx";
import "@citoyen/screens/Ecran.css";

export default function Demandes() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  async function charger() {
    setDemandes(await getDemandesStructure(user.id));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function repondre(demande, accepter) {
    let motif = "";
    if (!accepter) {
      motif = window.prompt("Motif du refus (le citoyen le verra) :", "Secteur trop éloigné de nos tournées");
      if (motif === null) return;
    }
    try {
      await repondreDemande(demande.id, accepter, motif);
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const aTraiter = demandes.filter((d) => d.statut === "en_attente");
  const traitees = demandes.filter((d) => d.statut !== "en_attente");

  return (
    <section className="ecran">
      <div>
        <h1>Demandes d'abonnement</h1>
        <p className="ecran-sous-titre">Vous acceptez ou refusez directement, sans passer par l'administration.</p>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      <p className="section-titre">À traiter ({aTraiter.length})</p>
      {!chargement && aTraiter.length === 0 && <p className="message message-vide">Aucune nouvelle demande.</p>}
      <div className="liste">
        {aTraiter.map((d) => (
          <article key={d.id} className="element">
            <div className="element-haut">
              <h3>{d.citoyenNom}</h3>
              <span className="element-meta">{dateCourte(d.date)}</span>
            </div>
            <p className="element-meta">
              {d.formule.nom} · {prix(d.formule.prix)} · {moyensPaiement[d.paiement]}
              <br />
              {d.quartier} · {d.repere}
            </p>
            <a href={`tel:${d.citoyenTelephone}`} className="element-meta">
              <Phone size={14} /> {d.citoyenTelephone}
            </a>
            <div className="element-actions">
              <button type="button" className="btn btn-valider" onClick={() => repondre(d, true)}>
                Accepter
              </button>
              <button type="button" className="btn btn-refuser" onClick={() => repondre(d, false)}>
                Refuser
              </button>
            </div>
          </article>
        ))}
      </div>

      {traitees.length > 0 && <p className="section-titre">Déjà traitées</p>}
      <div className="liste">
        {traitees.map((d) => (
          <article key={d.id} className="element">
            <div className="element-haut">
              <h3>{d.citoyenNom}</h3>
              <Badge statut={d.statut} liste={statutsAbonnement} />
            </div>
            <p className="element-meta">
              {d.formule.nom} · {d.quartier}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
