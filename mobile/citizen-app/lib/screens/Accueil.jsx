import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Building2, WifiOff, ChevronRight } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useReseau } from "../providers/useReseau.js";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { getMesSignalements } from "../services/signalements.js";
import { statutsSignalement, typesSignalement } from "../models/statuts.js";
import { dateCourte, prenom } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import "./Ecran.css";
import "./Accueil.css";

export default function Accueil() {
  const { user } = useAuth();
  const enLigne = useReseau();
  const [abonnements, setAbonnements] = useState([]);
  const [signalements, setSignalements] = useState([]);

  async function charger() {
    const [mesAbonnements, mesSignalements] = await Promise.all([
      getMesAbonnements(user.id),
      getMesSignalements(user.id),
    ]);
    setAbonnements(mesAbonnements);
    setSignalements(mesSignalements);
  }

  useActualisation(charger, user.id);

  const actif = abonnements.find((a) => a.statut === "accepte");
  const enAttente = abonnements.find((a) => a.statut === "en_attente");
  const dernier = signalements[0];

  return (
    <section className="ecran">
      <h1>Bonjour {prenom(user.nom)}</h1>

      {!enLigne && (
        <p className="message message-attention accueil-hors-ligne">
          <WifiOff size={20} />
          <span>
            <strong>Pas de réseau pour le moment.</strong> Continuez : vos envois partiront dès que le réseau revient.
          </span>
        </p>
      )}

      <Link to="/signaler" className="accueil-action accueil-signaler">
        <span className="accueil-action-icone">
          <Camera size={30} />
        </span>
        <span>
          <strong>Signaler un problème</strong>
          <small>Dépotoir sauvage ou caniveau bouché</small>
        </span>
      </Link>

      <Link to="/structures" className="accueil-action accueil-structures">
        <span className="accueil-action-icone">
          <Building2 size={30} />
        </span>
        <span>
          <strong>Trouver une structure</strong>
          <small>Les collecteurs de votre secteur</small>
        </span>
      </Link>

      <p className="section-titre">Ma collecte</p>
      {actif && (
        <div className="element">
          <div className="element-haut">
            <h3>{actif.structureNom}</h3>
            <span className="badge statut-ok">Abonné</span>
          </div>
          <p className="element-meta">
            {actif.formule.nom} · {actif.formule.frequence}
          </p>
          <Link to={`/collecte?abonnement=${actif.id}`} className="btn btn-primaire btn-large">
            Vider ma poubelle
          </Link>
        </div>
      )}
      {!actif && enAttente && (
        <Link to="/demandes" className="element">
          <div className="element-haut">
            <h3>{enAttente.structureNom}</h3>
            <span className="badge statut-attente">En attente</span>
          </div>
          <p className="element-meta">La structure doit accepter votre demande d'abonnement.</p>
        </Link>
      )}
      {!actif && !enAttente && (
        <p className="message message-vide">
          Pas encore d'abonnement. <Link to="/structures">Choisir une structure</Link>
        </p>
      )}

      {dernier && (
        <>
          <p className="section-titre">Mon dernier signalement</p>
          <Link to="/envois" className="element">
            <div className="element-haut">
              <h3>{typesSignalement[dernier.type]}</h3>
              <ChevronRight size={20} />
            </div>
            <p className="element-meta">
              {dernier.quartier} · {dateCourte(dernier.date)}
            </p>
            <Badge statut={dernier.statut} liste={statutsSignalement} />
          </Link>
        </>
      )}
    </section>
  );
}
