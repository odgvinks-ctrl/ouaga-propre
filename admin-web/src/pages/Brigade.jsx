import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, X } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { typesTache, statutsTache, listerTaches, signalerTache, annulerTache } from "../services/brigade.js";
import { listerSignalements } from "../services/signalements.js";
import { quartiers } from "@modeles/quartiers.js";
import { typesSignalement } from "@modeles/statuts.js";
import { dateHeure } from "@donnees/format.js";
import EtatVide from "../components/EtatVide.jsx";
import "./Brigade.css";

function demainMatin() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(7, 0, 0, 0);
  const decalage = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - decalage).toISOString().slice(0, 16);
}

const tacheVide = { type: "sanction", quartier: quartiers[0], lieu: "", consignes: "", date: demainMatin(), signalementId: "" };

export default function Brigade() {
  const [parametres, setParametres] = useSearchParams();
  const [taches, setTaches] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [filtre, setFiltre] = useState("actives");
  const [tache, setTache] = useState(tacheVide);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const [listeTaches, listeSignalements] = await Promise.all([listerTaches(), listerSignalements().catch(() => [])]);
    setTaches(listeTaches);
    setSignalements(listeSignalements);
  }

  useActualisation(charger, "brigade");

  useEffect(() => {
    const id = parametres.get("signalement");
    if (!id || signalements.length === 0) return;
    const s = signalements.find((x) => String(x.id) === id);
    if (!s) return;
    setTache({
      ...tacheVide,
      quartier: quartiers.includes(s.quartier) ? s.quartier : tacheVide.quartier,
      lieu: s.description ? s.description.slice(0, 120) : "",
      signalementId: String(s.id),
    });
    setParametres({}, { replace: true });
  }, [parametres, signalements]);

  const signalementsLibres = signalements.filter(
    (s) => s.statut !== "rejete" && !taches.some((t) => String(t.signalementId) === String(s.id) && t.statut !== "annulee")
  );
  const visibles = taches.filter((t) => (filtre === "actives" ? ["a_faire", "en_cours"].includes(t.statut) : filtre === "toutes" ? true : t.statut === filtre));
  const compte = (statut) => taches.filter((t) => t.statut === statut).length;

  function changer(e) {
    const { name, value } = e.target;
    const suite = { ...tache, [name]: value };
    if (name === "signalementId" && value) {
      const s = signalements.find((x) => String(x.id) === value);
      if (s && quartiers.includes(s.quartier)) suite.quartier = s.quartier;
    }
    setTache(suite);
    setErreur("");
  }

  async function agir(action, texte) {
    setEnvoi(true);
    try {
      await action();
      setMessage(texte);
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
      setMessage("");
    } finally {
      setEnvoi(false);
    }
  }

  function signaler(e) {
    e.preventDefault();
    agir(async () => {
      await signalerTache(tache);
      setTache({ ...tacheVide, date: tache.date });
    }, "Signalé à la brigade Laabal. Elle organise l'intervention.");
  }

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Brigade Laabal</h1>
          <p className="page-sous-titre">
            Signalez à la brigade les lieux à sensibiliser ou à contrôler. La brigade organise ses équipes et les sanctions, puis met à jour le suivi.
          </p>
        </div>
      </div>

      <div className="indicateurs">
        <div className={compte("a_faire") ? "indicateur attente" : "indicateur"}>
          <strong>{compte("a_faire")}</strong>
          <span>Signalées, en attente</span>
        </div>
        <div className="indicateur">
          <strong>{compte("en_cours")}</strong>
          <span>En cours</span>
        </div>
        <div className="indicateur ok">
          <strong>{compte("terminee")}</strong>
          <span>Traitées</span>
        </div>
      </div>

      {message && <p className="message message-ok">{message}</p>}
      {erreur && <p className="message message-erreur">{erreur}</p>}

      <div className="grille-principale">
        <div className="panneau">
          <div className="panneau-entete">
            <h2>Suivi</h2>
            <div className="filtres">
              {[
                ["actives", "En cours"],
                ["terminee", "Traitées"],
                ["toutes", "Toutes"],
              ].map(([cle, label]) => (
                <button key={cle} type="button" className={filtre === cle ? "actif" : ""} onClick={() => setFiltre(cle)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {visibles.length === 0 ? (
            <EtatVide titre="Rien à suivre" texte="Signalez un lieu avec le formulaire, ou depuis un signalement citoyen." />
          ) : (
            <ul className="brigade-taches">
              {visibles.map((t) => (
                <li key={t.id} className="brigade-tache">
                  <div className="brigade-tache-haut">
                    <div>
                      <strong>{typesTache[t.type]}</strong>
                      <small>
                        {t.quartier}
                        {t.lieu ? ` · ${t.lieu}` : ""} · souhaité le {dateHeure(t.date)}
                      </small>
                    </div>
                    <span className={`badge ${statutsTache[t.statut].classe}`}>{statutsTache[t.statut].label}</span>
                  </div>
                  {t.signalementId && <p className="champ-aide">Lié à un signalement citoyen</p>}
                  {t.consignes && <p className="champ-aide">{t.consignes}</p>}
                  {t.statut === "a_faire" && (
                    <div className="page-actions">
                      <button type="button" className="btn btn-danger btn-petit" disabled={envoi} onClick={() => agir(() => annulerTache(t.id), "Signalement annulé.")}>
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="panneau" onSubmit={signaler}>
          <div className="panneau-entete">
            <h2>Signaler à la brigade</h2>
          </div>
          <label className="champ">
            Signalement citoyen concerné (facultatif)
            <select name="signalementId" value={tache.signalementId} onChange={changer}>
              <option value="">Aucun</option>
              {signalementsLibres.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {typesSignalement[s.type]} · {s.quartier}
                </option>
              ))}
            </select>
          </label>
          <label className="champ">
            Type d'intervention
            <select name="type" value={tache.type} onChange={changer}>
              {Object.entries(typesTache).map(([cle, label]) => (
                <option key={cle} value={cle}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grille-deux">
            <label className="champ">
              Quartier
              <select name="quartier" value={tache.quartier} onChange={changer}>
                {quartiers.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              Date souhaitée
              <input type="datetime-local" name="date" value={tache.date} onChange={changer} required />
            </label>
          </div>
          <label className="champ">
            Lieu précis
            <input name="lieu" placeholder="Ex. : marché de Gounghin, côté est" value={tache.lieu} onChange={changer} required />
          </label>
          <label className="champ">
            Précisions pour la brigade
            <textarea name="consignes" placeholder="Ce qui a été constaté, auteur présumé, horaires..." value={tache.consignes} onChange={changer} />
          </label>
          <button type="submit" className="btn btn-primaire" disabled={envoi}>
            <Send size={16} /> Signaler
          </button>
        </form>
      </div>
    </section>
  );
}
