import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { getStructure } from "../services/structures.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { statutsAbonnement } from "../models/statuts.js";
import { prix, lienWhatsapp } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import "./Ecran.css";

export default function StructureDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [structure, setStructure] = useState(null);
  const [abonnement, setAbonnement] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    Promise.all([getStructure(id), getMesAbonnements(user.id)])
      .then(([s, abonnements]) => {
        setStructure(s);
        setAbonnement(abonnements.find((a) => a.structureId === id && a.statut !== "refuse") || null);
      })
      .catch((e) => setErreur(e.message));
  }, [id, user.id]);

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
    <section className="ecran">
      <Link to="/structures" className="ecran-retour">
        <ArrowLeft size={18} /> Structures
      </Link>

      <div>
        <h1>{structure.nom}</h1>
        <p className="ecran-sous-titre">
          {structure.type} · Responsable : {structure.responsable}
        </p>
      </div>

      {structure.description && <p className="element-meta">{structure.description}</p>}

      <div className="element-actions">
        <a href={`tel:${structure.telephone}`} className="btn btn-secondaire">
          <Phone size={18} /> Appeler
        </a>
        <a href={lienWhatsapp(structure.whatsapp)} target="_blank" rel="noreferrer noopener" className="btn btn-secondaire">
          <MessageCircle size={18} /> WhatsApp
        </a>
      </div>

      <p className="section-titre">Secteurs couverts</p>
      <div className="etiquettes">
        {structure.quartiers.map((q) => (
          <span key={q} className="etiquette">
            {q}
          </span>
        ))}
      </div>

      <p className="section-titre">Formules</p>
      {structure.formules.length === 0 && <p className="message message-vide">Cette structure n'a pas encore publié ses tarifs.</p>}
      <div className="liste">
        {structure.formules.map((f) => (
          <div key={f.id} className="element">
            <div className="element-haut">
              <h3>{f.nom}</h3>
              <strong>{prix(f.prix)}</strong>
            </div>
            <p className="element-meta">{f.frequence} · par mois</p>
          </div>
        ))}
      </div>

      {abonnement ? (
        <div className="element">
          <div className="element-haut">
            <h3>Votre demande</h3>
            <Badge statut={abonnement.statut} liste={statutsAbonnement} />
          </div>
          <Link to="/demandes" className="btn btn-secondaire">
            Voir mes demandes
          </Link>
        </div>
      ) : (
        structure.formules.length > 0 && (
          <Link to={`/structures/${structure.id}/abonnement`} className="btn btn-primaire btn-large">
            Demander un abonnement
          </Link>
        )
      )}
    </section>
  );
}
