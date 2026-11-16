import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Marker, Tooltip } from "react-leaflet";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerPoints, enregistrerPoint, supprimerPoint, typesPoint, etatRemplissage } from "../services/points.js";
import { listerStructures } from "../services/structures.js";
import { quartiers } from "@modeles/quartiers.js";
import { iconePoint } from "../maps/icones.js";
import CarteOuaga from "../maps/CarteOuaga.jsx";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";
import "./PointsRegroupement.css";

const vide = { id: "", nom: "", type: typesPoint[0], quartier: quartiers[0], capacite: "", remplissage: 0, position: null, structureId: "" };

export default function PointsRegroupement() {
  const [parametres, setParametres] = useSearchParams();
  const [points, setPoints] = useState([]);
  const [structures, setStructures] = useState([]);
  const [form, setForm] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const [p, s] = await Promise.all([listerPoints(), listerStructures()]);
    setPoints(p);
    setStructures(s.filter((x) => x.statut === "actif"));
  }

  useActualisation(charger, "points");

  useEffect(() => {
    const id = parametres.get("id");
    const point = points.find((p) => p.id === id);
    if (point && (!form || form.id !== id)) setForm({ ...point });
  }, [parametres, points.length]);

  function ouvrir(point) {
    setForm(point ? { ...point } : { ...vide, structureId: structures[0]?.id || "" });
    setErreur("");
    setMessage("");
    setParametres(point ? { id: point.id } : {});
  }

  function fermer() {
    setForm(null);
    setParametres({});
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await enregistrerPoint(form);
      setMessage(form.id ? "Point mis à jour." : "Point ajouté sur la carte.");
      fermer();
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer() {
    try {
      await supprimerPoint(aSupprimer.id);
      setASupprimer(null);
      if (form && form.id === aSupprimer.id) fermer();
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const pleins = points.filter((p) => p.remplissage >= 90).length;

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Points de regroupement</h1>
          <p className="page-sous-titre">
            {points.length} points suivis · {pleins} plein(s) à vider en priorité.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primaire" onClick={() => ouvrir(null)}>
            <Plus size={18} /> Ajouter un point
          </button>
        </div>
      </div>

      {message && <p className="message message-ok">{message}</p>}

      <div className="grille-principale">
        <div className="panneau points-carte">
          {form && (
            <p className="message message-info">
              <MapPin size={16} /> Cliquez sur la carte pour placer « {form.nom || "le nouveau point"} ».
            </p>
          )}
          <CarteOuaga
            hauteur={440}
            cadrage={form ? [] : points.map((p) => [p.position.lat, p.position.lng])}
            onClic={form ? (position) => setForm({ ...form, position }) : undefined}
          >
            {points
              .filter((p) => !form || p.id !== form.id)
              .map((p) => (
                <Marker key={p.id} position={[p.position.lat, p.position.lng]} icon={iconePoint(etatRemplissage(p.remplissage).couleur)} eventHandlers={{ click: () => ouvrir(p) }}>
                  <Tooltip>
                    {p.nom} · {p.remplissage} %
                  </Tooltip>
                </Marker>
              ))}
            {form?.position && <Marker position={[form.position.lat, form.position.lng]} icon={iconePoint(etatRemplissage(Number(form.remplissage)).couleur, true)} />}
          </CarteOuaga>
          <div className="legende">
            <span>
              <i style={{ borderRadius: 3, background: "#00853F" }}></i>Disponible
            </span>
            <span>
              <i style={{ borderRadius: 3, background: "#FCD116" }}></i>À vider bientôt (60 % et plus)
            </span>
            <span>
              <i style={{ borderRadius: 3, background: "#D71920" }}></i>Plein (90 % et plus)
            </span>
          </div>
        </div>

        <aside className="panneau">
          {!form && <EtatVide titre="Aucun point sélectionné" texte="Choisissez un point sur la carte ou dans le tableau, ou ajoutez-en un nouveau." />}
          {form && (
            <form className="points-formulaire" onSubmit={handleSubmit}>
              <div className="panneau-entete">
                <h2>{form.id ? "Modifier le point" : "Nouveau point"}</h2>
              </div>
              <label className="champ">
                Nom
                <input name="nom" value={form.nom} onChange={handleChange} placeholder="Ex. Marché de Gounghin" maxLength={60} />
              </label>
              <label className="champ">
                Type
                <select name="type" value={form.type} onChange={handleChange}>
                  {typesPoint.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <div className="points-ligne">
                <label className="champ">
                  Quartier
                  <select name="quartier" value={form.quartier} onChange={handleChange}>
                    {quartiers.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="champ">
                  Capacité (m³)
                  <input name="capacite" type="number" min="1" inputMode="numeric" value={form.capacite} onChange={handleChange} />
                </label>
              </div>
              <label className="champ">
                Remplissage actuel : {form.remplissage} %
                <input name="remplissage" type="range" min="0" max="100" step="5" value={form.remplissage} onChange={handleChange} />
              </label>
              <label className="champ">
                Structure gestionnaire
                <select name="structureId" value={form.structureId} onChange={handleChange}>
                  <option value="">Non attribué</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </label>
              <p className="champ-aide">
                {form.position ? `Position : ${form.position.lat.toFixed(5)}, ${form.position.lng.toFixed(5)}` : "Position : cliquez sur la carte."}
              </p>
              {erreur && <p className="message message-erreur">{erreur}</p>}
              <div className="page-actions">
                <button type="submit" className="btn btn-primaire" disabled={envoi}>
                  {envoi ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button type="button" className="btn btn-secondaire" onClick={fermer}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>

      {points.length > 0 && (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Point</th>
                <th>Quartier</th>
                <th className="nombre">Capacité</th>
                <th>Remplissage</th>
                <th>Gestionnaire</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...points]
                .sort((a, b) => b.remplissage - a.remplissage)
                .map((p) => {
                  const etat = etatRemplissage(p.remplissage);
                  return (
                    <tr key={p.id} className={form?.id === p.id ? "selectionne" : ""}>
                      <td className="cellule-principale">
                        <strong>{p.nom}</strong>
                        <small>{p.type}</small>
                      </td>
                      <td>{p.quartier}</td>
                      <td className="nombre">{p.capacite} m³</td>
                      <td>
                        <div className="points-remplissage">
                          <div className="barre-progression">
                            <i style={{ width: `${p.remplissage}%`, background: etat.couleur }}></i>
                          </div>
                          <span className={`badge ${etat.classe}`}>{p.remplissage} %</span>
                        </div>
                      </td>
                      <td>{p.structureNom}</td>
                      <td>
                        <div className="page-actions">
                          <button type="button" className="btn btn-secondaire btn-petit" onClick={() => ouvrir(p)}>
                            <Pencil size={14} /> Modifier
                          </button>
                          <button type="button" className="btn btn-danger btn-petit" onClick={() => setASupprimer(p)}>
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {aSupprimer && (
        <Dialogue titre={`Supprimer « ${aSupprimer.nom} » ?`} onFermer={() => setASupprimer(null)}>
          <p className="page-sous-titre">Le point disparaîtra de la carte et des tournées. Cette action est définitive.</p>
          <div className="dialogue-actions">
            <button type="button" className="btn btn-secondaire" onClick={() => setASupprimer(null)}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger-plein" onClick={supprimer}>
              Supprimer
            </button>
          </div>
        </Dialogue>
      )}
    </section>
  );
}
