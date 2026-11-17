import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Clock, XCircle, FileCheck, FileX } from "lucide-react";
import { chargerMoi } from "../services/auth.js";
import { getStructure } from "../services/structures.js";
import { piecesRequises } from "../models/documents.js";
import { apiActive } from "../services/http.js";
import { useAuth } from "../providers/AuthContext.jsx";
import "./Ecran.css";
import "./Auth.css";
import Logo from "../widgets/Logo.jsx";

export default function Validation() {
  const { user, enregistrer, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [structure, setStructure] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "structure" && !apiActive) getStructure(user.id).then(setStructure, () => setStructure(null));
  }, [user?.id]);

  if (!user) return <Navigate to="/connexion" replace />;
  if (user.role !== "structure" || user.statut === "actif") return <Navigate to="/" replace />;

  const refuse = user.statut === "refuse";

  async function verifier() {
    if (apiActive) {
      logout();
      navigate("/connexion", { state: { depuis: "/gestion" } });
      return;
    }
    setChargement(true);
    try {
      const compte = await chargerMoi();
      if (compte) enregistrer(compte);
      if (compte && compte.statut === "actif") {
        navigate("/gestion");
      } else {
        setMessage("Votre demande est toujours en cours de vérification.");
      }
    } finally {
      setChargement(false);
    }
  }

  function quitter() {
    logout();
    navigate("/connexion");
  }

  return (
    <section className="auth">
      <div className="auth-carte">
        <div className="auth-logo">
          <Logo hauteur={64} />
        </div>
        <span className={refuse ? "attente-icone refus" : "attente-icone"}>
          {refuse ? <XCircle size={28} /> : <Clock size={28} />}
        </span>
        <h1>{refuse ? "Inscription refusée" : "Inscription en cours de vérification"}</h1>
        <p className="auth-sous-titre">
          {refuse
            ? "L'administration n'a pas pu valider les informations de votre structure."
            : `Merci, ${user.nom}. L'administration vérifie votre pièce d'identité, vos numéros d'enregistrement et vos documents. Vous serez prévenu par SMS dès que votre compte est activé.`}
        </p>
        {refuse && user.motifRefus && <p className="message message-erreur">{user.motifRefus}</p>}
        {structure && (
          <div className="element">
            <p className="section-titre">Documents envoyés</p>
            {piecesRequises(structure.type)
              .filter((p) => p.obligatoire || (structure.pieces || {})[p.cle])
              .map((p) => {
                const fichier = (structure.pieces || {})[p.cle];
                return (
                  <p key={p.cle} className="validation-piece">
                    {fichier ? <FileCheck size={18} /> : <FileX size={18} />}
                    <span>
                      <strong>{p.label}</strong>
                      <small>{fichier || "Non fourni"}</small>
                    </span>
                  </p>
                );
              })}
          </div>
        )}
        {message && <p className="message message-attention">{message}</p>}
        {!refuse && (
          <button type="button" className="btn btn-primaire btn-large" onClick={verifier} disabled={chargement}>
            {chargement ? "Vérification..." : "Vérifier à nouveau"}
          </button>
        )}
        <button type="button" className="btn btn-secondaire btn-large" onClick={quitter}>
          Se déconnecter
        </button>
      </div>
    </section>
  );
}
