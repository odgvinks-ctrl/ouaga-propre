import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, ShieldCheck, MapPin, Send } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { getStructure } from "../services/structures.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { demarrerConversation } from "../services/messages.js";
import { statutsAbonnement } from "../models/statuts.js";
import { prix, lienWhatsapp, initiales } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import "./Ecran.css";
import "./StructureDetail.css";

export default function StructureDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [structure, setStructure] = useState(null);
  const [abonnement, setAbonnement] = useState(null);
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getStructure(id), user ? getMesAbonnements(user.id) : []])
      .then(([s, abonnements]) => {
        setStructure(s);
        setAbonnement(abonnements.find((a) => a.structureId === id && a.statut !== "refuse") || null);
      })
      .catch((e) => setErreur(e.message));
  }, [id, user?.id]);

  async function ecrire() {
    if (!user) {
      navigate("/connexion", { state: { depuis: `/structures/${id}` } });
      return;
    }
    const conversationId = await demarrerConversation(user.id, id);
    navigate(`/messagerie/${conversationId}`);
  }

  if (erreur) {
    return (
      <section className="ecran">
        <p className="message message-erreur">{erreur}</p>
        <Link to="/structures" className="ecran-retour">
          <ArrowLeft size={18} /> Retour aux structures
        </Link>
      </section>
    );
  }

  if (!structure) {
    return (
      <section className="ecran">
        <p className="message message-vide">Chargement...</p>
      </section>
    );
  }

  return (
    <section className="ecran fiche">
      <div className="fiche-bandeau">
        <Link to="/structures" className="fiche-retour">
          <ArrowLeft size={18} /> Structures
        </Link>
      </div>

      <div className="fiche-carte">
        <div className="fiche-identite">
          <span className="fiche-logo">{initiales(structure.nom)}</span>
          <div>
            <h1>{structure.nom}</h1>
            <span className="fiche-valide">
              <ShieldCheck size={14} /> Validée par la mairie
            </span>
          </div>
        </div>
        <div className="fiche-chiffres">
          <span>
            <strong>{structure.abonnes}</strong>
            <small>Abonnés</small>
          </span>
          <span>
            <strong>{structure.quartiers.length}</strong>
            <small>Quartiers</small>
          </span>
          <span>
            <strong>{structure.type}</strong>
            <small>Statut</small>
          </span>
        </div>
      </div>

      {structure.description && <p className="element-meta">{structure.description}</p>}
      <p className="element-meta">Responsable : {structure.responsable}</p>

      <p className="section-titre">Passe dans</p>
      <div className="etiquettes">
        {structure.quartiers.map((q) => (
          <span key={q} className={q === user?.secteur ? "etiquette fiche-chez-moi" : "etiquette"}>
            {q === user?.secteur && <MapPin size={13} />}
            {q}
          </span>
        ))}
      </div>

      <p className="section-titre">Formules</p>
      {structure.formules.length === 0 && <p className="message message-vide">Cette structure n'a pas encore publié ses tarifs.</p>}
      <div className="fiche-formules">
        {structure.formules.map((f) => (
          <div key={f.id} className="fiche-formule">
            <strong>{f.nom}</strong>
            <small>{f.frequence}</small>
            <b>
              {prix(f.prix)}
              <small> /mois</small>
            </b>
          </div>
        ))}
      </div>

      {abonnement && (
        <div className="element">
          <div className="element-haut">
            <h3>Votre demande</h3>
            <Badge statut={abonnement.statut} liste={statutsAbonnement} />
          </div>
          <Link to="/collecte" className="btn btn-secondaire">
            Voir mes demandes
          </Link>
        </div>
      )}

      <div className="fiche-actions">
        <div className="fiche-contacts">
          <a href={`tel:${structure.telephone}`} className="btn btn-secondaire">
            <Phone size={18} /> Appeler
          </a>
          <a href={lienWhatsapp(structure.whatsapp)} target="_blank" rel="noreferrer noopener" className="btn btn-secondaire">
            <MessageCircle size={18} /> WhatsApp
          </a>
          <button type="button" className="btn btn-secondaire" onClick={ecrire}>
            <Send size={18} /> Écrire
          </button>
        </div>
        {!abonnement && structure.formules.length > 0 && (
          <Link to={`/structures/${structure.id}/abonnement`} className="btn btn-primaire btn-large">
            M'abonner
          </Link>
        )}
      </div>
    </section>
  );
}
