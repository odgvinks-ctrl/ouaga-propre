import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, FileX, Phone, ShieldCheck, Ban } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerStructures, validerStructure, refuserStructure } from "../services/structures.js";
import { piecesRequises, libellesEnregistrement } from "@modeles/documents.js";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";
import "./ValidationStructures.css";

function controlesPour(structure) {
  const liste = [
    { cle: "identite", label: "Pièce d'identité lisible, au même nom que le responsable et au même numéro" },
    { cle: "legal", label: `${libellesEnregistrement[structure.type] || "Numéro d'enregistrement"} vérifié et document au nom de la structure` },
  ];
  if (structure.ifu || structure.type === "Entreprise") liste.push({ cle: "ifu", label: "Numéro IFU vérifié auprès des impôts" });
  liste.push({ cle: "telephone", label: "Responsable joint par téléphone" });
  return liste;
}

const motifs = ["Numéro d'enregistrement introuvable", "Pièce d'identité illisible ou au mauvais nom", "Document manquant ou incomplet", "Responsable injoignable"];

const onglets = [
  { cle: "en_attente", label: "En attente" },
  { cle: "refuse", label: "Refusées" },
  { cle: "actif", label: "Validées" },
];

export default function ValidationStructures() {
  const [parametres, setParametres] = useSearchParams();
  const [structures, setStructures] = useState([]);
  const [onglet, setOnglet] = useState("en_attente");
  const [coches, setCoches] = useState({});
  const [refus, setRefus] = useState(false);
  const [motif, setMotif] = useState(motifs[0]);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const selection = parametres.get("id");

  async function charger() {
    setStructures(await listerStructures());
  }

  useActualisation(charger, "validation");

  const visibles = structures.filter((s) => s.statut === onglet);
  const courant = structures.find((s) => s.id === selection) || null;
  const controles = courant ? controlesPour(courant) : [];
  const toutCoche = controles.every((c) => coches[c.cle]);

  useEffect(() => {
    setCoches({});
    setErreur("");
  }, [selection]);

  function selectionner(id) {
    setParametres({ id });
    setMessage("");
  }

  async function valider() {
    setEnvoi(true);
    try {
      await validerStructure(courant.id);
      setMessage(`${courant.nom} est validée. Elle peut maintenant utiliser l'application.`);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function confirmerRefus(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await refuserStructure(courant.id, motif);
      setRefus(false);
      setMessage(`Inscription de ${courant.nom} refusée. Le motif s'affiche sur son application.`);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Validation des structures</h1>
          <p className="page-sous-titre">
            Une structure ne peut recevoir ni abonnés ni interventions tant que son inscription n'est pas validée. Ce contrôle évite l'usurpation.
          </p>
        </div>
      </div>

      <div className="filtres">
        {onglets.map((o) => (
          <button key={o.cle} type="button" className={onglet === o.cle ? "actif" : ""} onClick={() => setOnglet(o.cle)}>
            {o.label} · {structures.filter((s) => s.statut === o.cle).length}
          </button>
        ))}
      </div>

      <div className="grille-principale">
        <div>
          {visibles.length === 0 ? (
            <EtatVide titre="Aucune structure" texte={onglet === "en_attente" ? "Toutes les inscriptions ont été traitées." : "Aucune structure dans cette catégorie."} />
          ) : (
            <div className="tableau-conteneur">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Structure</th>
                    <th>Responsable</th>
                    <th>Enregistrement</th>
                    <th>Quartier</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((s) => (
                    <tr key={s.id} className={s.id === selection ? "cliquable selectionne" : "cliquable"} onClick={() => selectionner(s.id)}>
                      <td className="cellule-principale">
                        <strong>{s.nom}</strong>
                        <small>{s.type}</small>
                      </td>
                      <td>{s.responsable}</td>
                      <td>{s.numeroEnregistrement}</td>
                      <td>{s.quartiers[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="panneau validation-detail">
          {!courant && <EtatVide titre="Aucune structure sélectionnée" texte="Choisissez une inscription pour contrôler les pièces." />}
          {courant && (
            <>
              <div className="panneau-entete">
                <h2>{courant.nom}</h2>
              </div>
              {message && <p className="message message-ok">{message}</p>}
              <dl className="liste-cles">
                <dt>Type</dt>
                <dd>{courant.type}</dd>
                <dt>Responsable</dt>
                <dd>{courant.responsable}</dd>
                <dt>Téléphone</dt>
                <dd>
                  <a href={`tel:${courant.telephone}`}>
                    <Phone size={14} /> {courant.telephone}
                  </a>
                </dd>
                <dt>Pièce d'identité</dt>
                <dd>{courant.numeroCnib || "Non renseignée"}</dd>
                <dt>{libellesEnregistrement[courant.type] || "N° d'enregistrement"}</dt>
                <dd>{courant.numeroEnregistrement}</dd>
                <dt>IFU</dt>
                <dd>{courant.ifu || "Non renseigné"}</dd>
                <dt>Quartiers demandés</dt>
                <dd>{courant.quartiers.join(", ")}</dd>
              </dl>

              <div className="validation-documents">
                <p className="surtitre">Documents fournis</p>
                {piecesRequises(courant.type).map((p) => {
                  const fichier = (courant.pieces || {})[p.cle] || (p.cle === "legal" ? courant.piece : "");
                  if (!fichier && !p.obligatoire) return null;
                  return (
                    <div key={p.cle} className={fichier ? "validation-document" : "validation-document manquant"}>
                      {fichier ? <FileText size={20} /> : <FileX size={20} />}
                      <div>
                        <strong>{p.label}</strong>
                        <small>{fichier || "Document obligatoire non fourni"}</small>
                      </div>
                    </div>
                  );
                })}
              </div>

              {courant.statut === "refuse" && courant.motifRefus && <p className="message message-erreur">Motif du refus : {courant.motifRefus}</p>}

              {erreur && <p className="message message-erreur">{erreur}</p>}

              {courant.statut === "en_attente" && (
                <>
                  <fieldset className="validation-controles">
                    <legend className="surtitre">Contrôles avant validation</legend>
                    {controles.map((c) => (
                      <label key={c.cle}>
                        <input
                          type="checkbox"
                          checked={Boolean(coches[c.cle])}
                          onChange={(e) => setCoches({ ...coches, [c.cle]: e.target.checked })}
                        />
                        {c.label}
                      </label>
                    ))}
                  </fieldset>
                  <div className="page-actions">
                    <button type="button" className="btn btn-primaire" onClick={valider} disabled={!toutCoche || envoi}>
                      <ShieldCheck size={16} /> Valider l'inscription
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => setRefus(true)} disabled={envoi}>
                      <Ban size={16} /> Refuser
                    </button>
                  </div>
                  {!toutCoche && <p className="champ-aide">Cochez tous les contrôles pour pouvoir valider.</p>}
                </>
              )}
            </>
          )}
        </aside>
      </div>

      {refus && courant && (
        <Dialogue titre={`Refuser ${courant.nom} ?`} onFermer={() => setRefus(false)}>
          <form className="validation-refus" onSubmit={confirmerRefus}>
            <div className="filtres">
              {motifs.map((m) => (
                <button key={m} type="button" className={motif === m ? "actif" : ""} onClick={() => setMotif(m)}>
                  {m}
                </button>
              ))}
            </div>
            <label className="champ">
              Motif affiché à la structure
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} />
            </label>
            <div className="dialogue-actions">
              <button type="button" className="btn btn-secondaire" onClick={() => setRefus(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-danger-plein" disabled={envoi}>
                Refuser l'inscription
              </button>
            </div>
          </form>
        </Dialogue>
      )}
    </section>
  );
}
