import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Trash2, ChevronRight, Building2 } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { demanderCollecte, getMesCollectes } from "../services/collectes.js";
import { getStructures, prixMinimum } from "../services/structures.js";
import { statutsAbonnement, statutsCollecte, volumes } from "../models/statuts.js";
import { dateCourte, dateHeure, prix, initiales } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import EtatVide from "../widgets/EtatVide.jsx";
import "./Ecran.css";
import "./DemandeCollecte.css";

export default function DemandeCollecte() {
  const { user } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [abonnements, setAbonnements] = useState([]);
  const [collectes, setCollectes] = useState([]);
  const [structures, setStructures] = useState([]);
  const [abonnementId, setAbonnementId] = useState(params.get("abonnement") || "");
  const [volume, setVolume] = useState("moyen");
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  async function charger() {
    const [a, c, s] = await Promise.all([getMesAbonnements(user.id), getMesCollectes(user.id), getStructures(user.secteur)]);
    setAbonnements(a);
    setCollectes(c);
    setStructures(s);
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

  function etatDemande(structureId) {
    return abonnements.find((a) => a.structureId === structureId && a.statut !== "refuse");
  }

  const choixStructures = (
    <>
      <div className="collecte-titre">
        <p className="section-titre">{acceptes.length ? "Autres structures de mon quartier" : `Structures à ${user.secteur || "Ouagadougou"}`}</p>
        <Link to="/structures">Tous les quartiers</Link>
      </div>
      {!chargement && structures.length === 0 && (
        <EtatVide icone={Building2} titre="Aucune structure dans votre quartier" texte="Consultez les structures des quartiers voisins.">
          <Link to="/structures" className="btn btn-secondaire">
            Voir toutes les structures
          </Link>
        </EtatVide>
      )}
      <div className="groupe">
        {structures.map((s) => {
          const demande = etatDemande(s.id);
          const minimum = prixMinimum(s);
          return (
            <Link key={s.id} to={`/structures/${s.id}`} className="groupe-ligne collecte-structure">
              <span className="logo-structure">{initiales(s.nom)}</span>
              <span>
                <strong>{s.nom}</strong>
                <small>{minimum !== null ? `À partir de ${prix(minimum)} par mois` : "Tarifs pas encore publiés"}</small>
              </span>
              {demande ? <Badge statut={demande.statut} liste={statutsAbonnement} /> : <span className="collecte-choisir">Choisir</span>}
              <ChevronRight size={18} />
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <section className="ecran">
      <div>
        <h1>Ma collecte</h1>
        <p className="ecran-sous-titre">
          {acceptes.length
            ? "Demandez un passage quand votre poubelle est pleine."
            : "Choisissez une structure de pré-collecte et abonnez-vous : elle viendra vider votre poubelle à domicile."}
        </p>
      </div>

      {state?.envoye && <p className="message message-ok">Votre demande d'abonnement est envoyée. La structure vous répond directement.</p>}
      {succes && <p className="message message-ok">{succes}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      {!chargement && acceptes.length === 0 && choixStructures}

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
            <p className="element-meta">
              Avec {acceptes[0].structureNom} · formule {acceptes[0].formule.nom}
            </p>
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

      {abonnements.length > 0 && (
        <>
          <p className="section-titre">Mes abonnements</p>
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
                {a.statut === "en_attente" && <p className="element-meta">La structure doit accepter votre demande.</p>}
                {a.statut === "refuse" && a.motifRefus && <p className="message message-erreur">{a.motifRefus}</p>}
              </article>
            ))}
          </div>
        </>
      )}

      {collectes.length > 0 && (
        <>
          <p className="section-titre">Mes collectes</p>
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
        </>
      )}

      {!chargement && acceptes.length > 0 && choixStructures}
    </section>
  );
}
