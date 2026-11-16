import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { getMesAbonnements } from "../services/abonnements.js";
import { demanderCollecte } from "../services/collectes.js";
import { volumes } from "../models/statuts.js";
import "./Ecran.css";

export default function Collecte() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [abonnements, setAbonnements] = useState(null);
  const [abonnementId, setAbonnementId] = useState(params.get("abonnement") || "");
  const [volume, setVolume] = useState("moyen");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    getMesAbonnements(user.id).then((liste) => {
      const acceptes = liste.filter((a) => a.statut === "accepte");
      setAbonnements(acceptes);
      setAbonnementId((actuel) => (acceptes.some((a) => a.id === actuel) ? actuel : acceptes[0]?.id || ""));
    });
  }, [user.id]);

  async function envoyer() {
    setChargement(true);
    try {
      await demanderCollecte(user.id, abonnementId, volume);
      navigate("/demandes", { state: { collecte: true } });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  if (!abonnements) {
    return (
      <section className="ecran">
        <p className="message message-vide">Chargement...</p>
      </section>
    );
  }

  if (abonnements.length === 0) {
    return (
      <section className="ecran">
        <h1>Vider ma poubelle</h1>
        <p className="message message-attention">
          La collecte à domicile est réservée aux abonnés : c'est l'abonnement qui paie la tournée du pré-collecteur.
        </p>
        <Link to="/structures" className="btn btn-primaire btn-large">
          Trouver une structure
        </Link>
      </section>
    );
  }

  return (
    <section className="ecran">
      <h1>Vider ma poubelle</h1>

      {abonnements.length > 1 && (
        <label className="champ">
          Structure
          <select value={abonnementId} onChange={(e) => setAbonnementId(e.target.value)}>
            {abonnements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.structureNom}
              </option>
            ))}
          </select>
        </label>
      )}

      {abonnements.length === 1 && <p className="ecran-sous-titre">Avec {abonnements[0].structureNom}</p>}

      <div className="champ">
        Quantité de déchets
        <div className="choix-groupe">
          {Object.entries(volumes).map(([cle, label]) => (
            <button key={cle} type="button" className={volume === cle ? "choix actif" : "choix"} onClick={() => setVolume(cle)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}

      <button type="button" className="btn btn-primaire btn-large" onClick={envoyer} disabled={chargement}>
        <Trash2 size={20} /> {chargement ? "Envoi..." : "Demander le passage"}
      </button>
      <p className="champ-aide">La structure planifie le passage et vous voyez la date dans « Mes demandes ».</p>
    </section>
  );
}
