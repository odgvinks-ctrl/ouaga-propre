import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Play, Check, X, UserPlus, Phone, Gavel, TriangleAlert } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import {
  roles,
  typesTache,
  statutsTache,
  infractions,
  typesSanction,
  statutsSanction,
  agentsCompatibles,
  agentsDeControle,
  listerSanctions,
  creerSanction,
  changerStatutSanction,
  recidive,
  listerAgents,
  ajouterAgent,
  changerAgent,
  listerTaches,
  creerTache,
  changerStatutTache,
} from "../services/brigade.js";
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

const tacheVide = { type: "sensibilisation", quartier: quartiers[0], lieu: "", consignes: "", date: demainMatin(), agentIds: [], signalementId: "" };
const agentVide = { nom: "", telephone: "", role: "sensibilisation", quartier: quartiers[0] };
const sanctionVide = {
  type: "amende",
  infraction: "depot_sauvage",
  montant: infractions.depot_sauvage.montant,
  contrevenant: "",
  telephone: "",
  quartier: quartiers[0],
  lieu: "",
  agentId: "",
  signalementId: "",
};

function fcfa(montant) {
  return `${Number(montant).toLocaleString("fr-FR")} FCFA`;
}

export default function Brigade() {
  const [parametres, setParametres] = useSearchParams();
  const [agents, setAgents] = useState([]);
  const [taches, setTaches] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [onglet, setOnglet] = useState("taches");
  const [filtre, setFiltre] = useState("actives");
  const [tache, setTache] = useState(tacheVide);
  const [agent, setAgent] = useState(agentVide);
  const [sanctions, setSanctions] = useState([]);
  const [sanction, setSanction] = useState(sanctionVide);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const [listeAgents, listeTaches, listeSignalements, listeSanctions] = await Promise.all([
      listerAgents(),
      listerTaches(),
      listerSignalements().catch(() => []),
      listerSanctions(),
    ]);
    setAgents(listeAgents);
    setTaches(listeTaches);
    setSanctions(listeSanctions);
    setSignalements(listeSignalements);
  }

  useActualisation(charger, "brigade");

  useEffect(() => {
    const id = parametres.get("signalement");
    if (!id || signalements.length === 0) return;
    const s = signalements.find((x) => String(x.id) === id);
    if (!s) return;
    setOnglet("taches");
    setTache({
      ...tacheVide,
      type: "sanction",
      quartier: quartiers.includes(s.quartier) ? s.quartier : tacheVide.quartier,
      lieu: s.description ? s.description.slice(0, 120) : "",
      signalementId: String(s.id),
    });
    setParametres({}, { replace: true });
  }, [parametres, signalements]);

  const compatibles = useMemo(() => agentsCompatibles(agents, tache.type), [agents, tache.type]);
  const nomAgent = (id) => (agents.find((a) => a.id === id) || {}).nom || "Agent retiré";
  const enCharge = (id) => taches.filter((t) => t.agentIds.includes(id) && ["a_faire", "en_cours"].includes(t.statut)).length;
  const signalementsLibres = signalements.filter(
    (s) => ["a_verifier", "verifie"].includes(s.statut) && !taches.some((t) => String(t.signalementId) === String(s.id) && t.statut !== "annulee")
  );

  const visibles = taches.filter((t) => (filtre === "actives" ? ["a_faire", "en_cours"].includes(t.statut) : filtre === "toutes" ? true : t.statut === filtre));

  function changerTache(e) {
    const { name, value } = e.target;
    const suite = { ...tache, [name]: value };
    if (name === "type") {
      const permis = agentsCompatibles(agents, value).map((a) => a.id);
      suite.agentIds = tache.agentIds.filter((id) => permis.includes(id));
    }
    if (name === "signalementId" && value) {
      const s = signalements.find((x) => String(x.id) === value);
      if (s) {
        suite.type = "sanction";
        if (quartiers.includes(s.quartier)) suite.quartier = s.quartier;
        const permis = agentsCompatibles(agents, suite.type).map((a) => a.id);
        suite.agentIds = suite.agentIds.filter((id) => permis.includes(id));
      }
    }
    setTache(suite);
    setErreur("");
  }

  function basculerAgent(id) {
    setTache({ ...tache, agentIds: tache.agentIds.includes(id) ? tache.agentIds.filter((x) => x !== id) : [...tache.agentIds, id] });
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

  function assigner(e) {
    e.preventDefault();
    agir(async () => {
      await creerTache(tache, agents);
      setTache({ ...tacheVide, date: tache.date });
    }, "Tâche assignée. Les agents la voient dans leur liste du jour.");
  }

  function recruter(e) {
    e.preventDefault();
    agir(async () => {
      await ajouterAgent(agent);
      setAgent({ ...agentVide, role: agent.role, quartier: agent.quartier });
    }, "Agent ajouté à la brigade.");
  }

  const controleurs = agentsDeControle(agents);
  const dejaSanctionne = recidive(sanctions, sanction.telephone, sanction.contrevenant);
  const aPayer = sanctions.filter((x) => x.statut === "a_payer");

  function changerSanction(e) {
    const { name, value } = e.target;
    const suite = { ...sanction, [name]: value };
    if (name === "infraction") suite.montant = infractions[value].montant;
    if (name === "signalementId" && value) {
      const s = signalements.find((x) => String(x.id) === value);
      if (s && quartiers.includes(s.quartier)) suite.quartier = s.quartier;
    }
    setSanction(suite);
    setErreur("");
  }

  function sanctionnerDepuis(t) {
    setSanction({
      ...sanctionVide,
      quartier: t.quartier,
      lieu: t.lieu,
      agentId: t.agentIds.find((id) => controleurs.some((a) => a.id === id)) || "",
      signalementId: t.signalementId ? String(t.signalementId) : "",
    });
    setOnglet("sanctions");
    setMessage("");
  }

  function dresser(e) {
    e.preventDefault();
    agir(async () => {
      await creerSanction(sanction, agents);
      setSanction({ ...sanctionVide, quartier: sanction.quartier, agentId: sanction.agentId });
    }, sanction.type === "amende" ? "Amende enregistrée." : "Avertissement enregistré.");
  }

  const parRole = Object.keys(roles).map((cle) => ({ cle, nombre: agents.filter((a) => a.actif && a.role === cle).length }));

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Brigade Laabal</h1>
          <p className="page-sous-titre">
            {agents.filter((a) => a.actif).length} agents actifs · {taches.filter((t) => ["a_faire", "en_cours"].includes(t.statut)).length} tâches en cours. Chaque
            tâche ne peut être confiée qu'aux agents dont le rôle correspond.
          </p>
        </div>
        <div className="filtres">
          <button type="button" className={onglet === "taches" ? "actif" : ""} onClick={() => setOnglet("taches")}>
            Tâches
          </button>
          <button type="button" className={onglet === "sanctions" ? "actif" : ""} onClick={() => setOnglet("sanctions")}>
            Sanctions
          </button>
          <button type="button" className={onglet === "agents" ? "actif" : ""} onClick={() => setOnglet("agents")}>
            Agents
          </button>
        </div>
      </div>

      <div className="indicateurs">
        {parRole.map((r) => (
          <div key={r.cle} className="indicateur">
            <strong>{r.nombre}</strong>
            <span>{roles[r.cle].label}</span>
          </div>
        ))}
        <div className={aPayer.length ? "indicateur attente" : "indicateur"}>
          <strong>{fcfa(aPayer.reduce((t, x) => t + x.montant, 0))}</strong>
          <span>{aPayer.length} amende(s) à payer</span>
        </div>
        <div className="indicateur">
          <strong>{fcfa(sanctions.filter((x) => x.statut === "payee").reduce((t, x) => t + x.montant, 0))}</strong>
          <span>Amendes encaissées</span>
        </div>
      </div>

      {message && <p className="message message-ok">{message}</p>}
      {erreur && <p className="message message-erreur">{erreur}</p>}

      {onglet === "taches" && (
        <div className="grille-principale">
          <div className="panneau">
            <div className="panneau-entete">
              <h2>Tâches</h2>
              <div className="filtres">
                {[
                  ["actives", "En cours"],
                  ["terminee", "Terminées"],
                  ["toutes", "Toutes"],
                ].map(([cle, label]) => (
                  <button key={cle} type="button" className={filtre === cle ? "actif" : ""} onClick={() => setFiltre(cle)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {visibles.length === 0 ? (
              <EtatVide titre="Aucune tâche" texte="Assignez une tâche avec le formulaire, ou depuis un signalement vérifié." />
            ) : (
              <ul className="brigade-taches">
                {visibles.map((t) => (
                  <li key={t.id} className="brigade-tache">
                    <div className="brigade-tache-haut">
                      <div>
                        <strong>{typesTache[t.type]}</strong>
                        <small>
                          {t.quartier}
                          {t.lieu ? ` · ${t.lieu}` : ""} · {dateHeure(t.date)}
                        </small>
                      </div>
                      <span className={`badge ${statutsTache[t.statut].classe}`}>{statutsTache[t.statut].label}</span>
                    </div>
                    <p className="brigade-agents">{t.agentIds.map(nomAgent).join(", ")}</p>
                    {t.signalementId && <p className="champ-aide">Lié à un signalement citoyen</p>}
                    {t.consignes && <p className="champ-aide">{t.consignes}</p>}
                    {["a_faire", "en_cours"].includes(t.statut) && (
                      <div className="page-actions">
                        {t.statut === "a_faire" && (
                          <button type="button" className="btn btn-secondaire btn-petit" disabled={envoi} onClick={() => agir(() => changerStatutTache(t.id, "en_cours"), "Tâche démarrée.")}>
                            <Play size={14} /> Démarrer
                          </button>
                        )}
                        {t.type === "sanction" && (
                          <button type="button" className="btn btn-secondaire btn-petit" onClick={() => sanctionnerDepuis(t)}>
                            <Gavel size={14} /> Dresser une sanction
                          </button>
                        )}
                        <button type="button" className="btn btn-primaire btn-petit" disabled={envoi} onClick={() => agir(() => changerStatutTache(t.id, "terminee"), "Tâche terminée.")}>
                          <Check size={14} /> Terminée
                        </button>
                        <button type="button" className="btn btn-danger btn-petit" disabled={envoi} onClick={() => agir(() => changerStatutTache(t.id, "annulee"), "Tâche annulée.")}>
                          <X size={14} /> Annuler
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="panneau" onSubmit={assigner}>
            <div className="panneau-entete">
              <h2>Nouvelle tâche</h2>
            </div>
            <label className="champ">
              Signalement à contrôler (facultatif)
              <select name="signalementId" value={tache.signalementId} onChange={changerTache}>
                <option value="">Aucun, tâche planifiée par la mairie</option>
                {signalementsLibres.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {typesSignalement[s.type]} · {s.quartier}
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              Type de tâche
              <select name="type" value={tache.type} onChange={changerTache}>
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
                <select name="quartier" value={tache.quartier} onChange={changerTache}>
                  {quartiers.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label className="champ">
                Date et heure
                <input type="datetime-local" name="date" value={tache.date} onChange={changerTache} required />
              </label>
            </div>
            <label className="champ">
              Lieu précis
              <input name="lieu" placeholder="Ex. : marché de Gounghin, côté est" value={tache.lieu} onChange={changerTache} required />
            </label>
            <label className="champ">
              Consignes
              <textarea name="consignes" placeholder="Messages à faire passer, ménages à visiter, contrevenant présumé..." value={tache.consignes} onChange={changerTache} />
            </label>

            <fieldset className="brigade-choix">
              <legend className="champ">Agents assignés · rôle « {roles[tache.type].label} » ou chef d'équipe</legend>
              {compatibles.length === 0 && <p className="message message-attention">Aucun agent actif n'a ce rôle. Ajoutez-en un dans l'onglet Agents.</p>}
              {compatibles.map((a) => (
                <label key={a.id} className={tache.agentIds.includes(a.id) ? "brigade-agent choisi" : "brigade-agent"}>
                  <input type="checkbox" checked={tache.agentIds.includes(a.id)} onChange={() => basculerAgent(a.id)} />
                  <span>
                    <strong>{a.nom}</strong>
                    <small>
                      {roles[a.role].court} · {a.quartier}
                      {a.quartier === tache.quartier ? " · sur place" : ""} · {enCharge(a.id)} tâche(s) en cours
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>

            <button type="submit" className="btn btn-primaire" disabled={envoi}>
              <Plus size={16} /> Assigner la tâche
            </button>
          </form>
        </div>
      )}

      {onglet === "sanctions" && (
        <div className="grille-principale">
          <div className="panneau">
            <div className="panneau-entete">
              <h2>Sanctions</h2>
            </div>
            {sanctions.length === 0 ? (
              <EtatVide titre="Aucune sanction" texte="Les avertissements et amendes dressés par la brigade apparaîtront ici." />
            ) : (
              <ul className="brigade-taches">
                {sanctions.map((x) => (
                  <li key={x.id} className="brigade-tache">
                    <div className="brigade-tache-haut">
                      <div>
                        <strong>{infractions[x.infraction]?.label || x.infraction}</strong>
                        <small>
                          {x.contrevenant}
                          {x.telephone ? ` · ${x.telephone}` : ""} · {x.quartier}
                          {x.lieu ? `, ${x.lieu}` : ""} · {dateHeure(x.date)}
                        </small>
                      </div>
                      <span className={`badge ${statutsSanction[x.statut].classe}`}>{statutsSanction[x.statut].label}</span>
                    </div>
                    <p className="brigade-agents">
                      {x.type === "amende" ? fcfa(x.montant) : "Avertissement"} · par {nomAgent(x.agentId)}
                    </p>
                    {["a_payer", "contestee"].includes(x.statut) && (
                      <div className="page-actions">
                        <button type="button" className="btn btn-primaire btn-petit" disabled={envoi} onClick={() => agir(() => changerStatutSanction(x.id, "payee"), "Amende marquée payée.")}>
                          <Check size={14} /> Payée
                        </button>
                        {x.statut === "a_payer" && (
                          <button type="button" className="btn btn-secondaire btn-petit" disabled={envoi} onClick={() => agir(() => changerStatutSanction(x.id, "contestee"), "Contestation enregistrée.")}>
                            Contestée
                          </button>
                        )}
                        <button type="button" className="btn btn-danger btn-petit" disabled={envoi} onClick={() => agir(() => changerStatutSanction(x.id, "annulee"), "Sanction annulée.")}>
                          <X size={14} /> Annuler
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="panneau" onSubmit={dresser}>
            <div className="panneau-entete">
              <h2>Dresser une sanction</h2>
            </div>
            <div className="filtres">
              {Object.entries(typesSanction).map(([cle, label]) => (
                <button key={cle} type="button" className={sanction.type === cle ? "actif" : ""} onClick={() => setSanction({ ...sanction, type: cle })}>
                  {label}
                </button>
              ))}
            </div>
            <label className="champ">
              Infraction constatée
              <select name="infraction" value={sanction.infraction} onChange={changerSanction}>
                {Object.entries(infractions).map(([cle, i]) => (
                  <option key={cle} value={cle}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>
            {sanction.type === "amende" && (
              <label className="champ">
                Montant de l'amende (FCFA)
                <input type="number" name="montant" min="0" step="500" value={sanction.montant} onChange={changerSanction} required />
                <span className="champ-aide">Barème indicatif, à fixer avec la mairie.</span>
              </label>
            )}
            <div className="grille-deux">
              <label className="champ">
                Nom du contrevenant
                <input name="contrevenant" value={sanction.contrevenant} onChange={changerSanction} required />
              </label>
              <label className="champ">
                Téléphone (facultatif)
                <input type="tel" inputMode="numeric" name="telephone" value={sanction.telephone} onChange={changerSanction} />
              </label>
            </div>
            {dejaSanctionne.length > 0 && (
              <p className="message message-attention">
                <TriangleAlert size={16} /> Déjà sanctionné {dejaSanctionne.length} fois, dernière fois le {dateHeure(dejaSanctionne[0].date)}. Pensez à l'infraction « Récidive ».
              </p>
            )}
            <div className="grille-deux">
              <label className="champ">
                Quartier
                <select name="quartier" value={sanction.quartier} onChange={changerSanction}>
                  {quartiers.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label className="champ">
                Lieu
                <input name="lieu" value={sanction.lieu} onChange={changerSanction} required />
              </label>
            </div>
            <label className="champ">
              Agent qui dresse la sanction
              <select name="agentId" value={sanction.agentId} onChange={changerSanction} required>
                <option value="">Choisir un agent de contrôle ou un chef d'équipe</option>
                {controleurs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom} · {roles[a.role].court}
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              Signalement concerné (facultatif)
              <select name="signalementId" value={sanction.signalementId} onChange={changerSanction}>
                <option value="">Aucun</option>
                {signalements
                  .filter((s) => s.statut !== "rejete")
                  .map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {typesSignalement[s.type]} · {s.quartier}
                    </option>
                  ))}
              </select>
            </label>
            <p className="champ-aide">Seules les informations utiles à la sanction sont enregistrées : nom, téléphone facultatif et lieu.</p>
            <button type="submit" className="btn btn-primaire" disabled={envoi}>
              <Gavel size={16} /> {sanction.type === "amende" ? "Enregistrer l'amende" : "Enregistrer l'avertissement"}
            </button>
          </form>
        </div>
      )}

      {onglet === "agents" && (
        <div className="grille-principale">
          <div className="tableau-conteneur">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Rôle</th>
                  <th>Quartier</th>
                  <th className="nombre">Tâches en cours</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.nom}</strong>
                      <small className="champ-aide brigade-telephone">
                        <Phone size={12} /> {a.telephone}
                      </small>
                    </td>
                    <td>
                      <select
                        className="brigade-role"
                        value={a.role}
                        aria-label={`Rôle de ${a.nom}`}
                        onChange={(e) => agir(() => changerAgent(a.id, { role: e.target.value }), `Rôle de ${a.nom} mis à jour.`)}
                      >
                        {Object.entries(roles).map(([cle, r]) => (
                          <option key={cle} value={cle}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{a.quartier}</td>
                    <td className="nombre">{enCharge(a.id)}</td>
                    <td>
                      <span className={a.actif ? "badge statut-ok" : "badge statut-refus"}>{a.actif ? "Actif" : "Inactif"}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={a.actif ? "btn btn-danger btn-petit" : "btn btn-secondaire btn-petit"}
                        disabled={envoi}
                        onClick={() => agir(() => changerAgent(a.id, { actif: !a.actif }), a.actif ? `${a.nom} est désactivé.` : `${a.nom} est réactivé.`)}
                      >
                        {a.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="panneau" onSubmit={recruter}>
            <div className="panneau-entete">
              <h2>Ajouter un agent</h2>
            </div>
            <label className="champ">
              Nom complet
              <input value={agent.nom} onChange={(e) => setAgent({ ...agent, nom: e.target.value })} required />
            </label>
            <label className="champ">
              Téléphone
              <input type="tel" inputMode="numeric" value={agent.telephone} onChange={(e) => setAgent({ ...agent, telephone: e.target.value })} required />
            </label>
            <label className="champ">
              Rôle
              <select value={agent.role} onChange={(e) => setAgent({ ...agent, role: e.target.value })}>
                {Object.entries(roles).map(([cle, r]) => (
                  <option key={cle} value={cle}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="champ">
              Quartier d'affectation
              <select value={agent.quartier} onChange={(e) => setAgent({ ...agent, quartier: e.target.value })}>
                {quartiers.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primaire" disabled={envoi}>
              <UserPlus size={16} /> Ajouter à la brigade
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
