import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { demanderCollecte, getMesCollectes } from "../services/collectes.js";
import { statutsAbonnement, statutsCollecte, volumes } from "../models/statuts.js";
import { dateCourte, dateHeure, prix } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import "./Ecran.css";

export default function DemandeCollecte() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [abonnements, setAbonnements] = useState([]);
  const [collectes, setCollectes] = useState([]);
  const [abonnementId, setAbonnementId] = useState(params.get("abonnement") || "");
  const [volume, setVolume] = useState("moyen");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  async function charger() {
    const [a, c] = await Promise.all([getMesAbonnements(user.id), getMesCollectes(user.id)]);
    setAbonnements(a);
    setCollectes(c);
    const acceptes = a.filter((x) => x.statut === "accepte");
    setAbonnementId((actuel) => (acceptes.some((x) => x.id === actuel) ? actuel : acceptes[0]?.id || ""));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function envoyer() {
    setEnvoi(true);
    try {
      await demanderCollecte(user.id, abonnementId, volume);
      setErreur("");
      setSucces("Votre demande de collecte est envoyée à la structure.");
      navigate("/collecte", { replace: true });
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const acceptes = abonnements.filter((a) => a.statut === "accepte");

  return (
    <section className="ecran">
      <h1>Demande de collecte</h1>

      {state?.envoye && <p className="message message-ok">Votre demande d'abonnement est envoyée à la structure.</p>}
      {succes && <p className="message message-ok">{succes}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      {!chargement && acceptes.length === 0 && (
        <>
          <p className="message message-attention">
            La collecte à domicile est réservée aux abonnés : c'est l'abonnement qui paie la tournée du pré-collecteur.
          </p>
          <Link to="/structures" className="btn btn-primaire btn-large">
            Trouver une structure
          </Link>
        </>
      )}

      {acceptes.length > 0 && (
        <div className="element">
          <h3>Vider ma poubelle</h3>
          {acceptes.length > 1 ? (
            <label className="champ">
              Structure
              <select value={abonnementId} onChange={(e) => setAbonnementId(e.target.value)}>
                {acceptes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.structureNom}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="element-meta">Avec {acceptes[0].structureNom}</p>
          )}
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
          <button type="button" className="btn btn-primaire btn-large" onClick={envoyer} disabled={envoi}>
            <Trash2 size={20} /> {envoi ? "Envoi..." : "Demander le passage"}
          </button>
        </div>
      )}

      <p className="section-titre">Mes collectes</p>
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

      <p className="section-titre">Mes abonnements</p>
      {!chargement && abonnements.length === 0 && <p className="message message-vide">Aucune demande d'abonnement.</p>}
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
          </article>
        ))}
      </div>
    </section>
  );
}
