import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleMarker } from "react-leaflet";
import { Search, Camera, Users, Send, Ban } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerSignalements, transmettreSignalement, rejeterSignalement, structuresDuSecteur } from "../services/signalements.js";
import { listerStructures } from "../services/structures.js";
import { statutsSignalement, typesSignalement, volumes } from "@modeles/statuts.js";
import { dateCourte, dateHeure } from "@donnees/format.js";
import { couleursStatut } from "../maps/couleurs.js";
import CarteOuaga from "../maps/CarteOuaga.jsx";
import Badge from "../components/Badge.jsx";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";
import "./Signalements.css";

const onglets = [
  { cle: "a_verifier", label: "À vérifier" },
  { cle: "transmis", label: "Transmis" },
  { cle: "pris_en_charge", label: "Pris en charge" },
  { cle: "nettoye", label: "Nettoyés" },
  { cle: "rejete", label: "Rejetés" },
  { cle: "", label: "Tous" },
];

const motifs = ["Photo floue ou sans rapport", "Lieu déjà nettoyé", "Doublon d'un signalement existant", "Position incorrecte"];

function niveau(score) {
  if (score >= 70) return { label: "Fiable", couleur: "#00853F" };
  if (score >= 40) return { label: "À contrôler", couleur: "#FCD116" };
  return { label: "Douteux", couleur: "#D71920" };
}

export default function Signalements() {
  const [parametres, setParametres] = useSearchParams();
  const [signalements, setSignalements] = useState([]);
  const [structures, setStructures] = useState([]);
  const [onglet, setOnglet] = useState("a_verifier");
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState("");
  const [rejet, setRejet] = useState(null);
  const [motif, setMotif] = useState(motifs[0]);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const selection = parametres.get("id");

  async function charger() {
    const [liste, toutes] = await Promise.all([listerSignalements(), listerStructures()]);
    setSignalements(liste);
    setStructures(toutes);
  }

  useActualisation(charger, "signalements");

  const courant = signalements.find((s) => s.id === selection) || null;
  const proposees = courant ? structuresDuSecteur(structures, courant.quartier) : [];

  useEffect(() => {
    if (courant && courant.statut !== onglet && onglet !== "") setOnglet(courant.statut);
  }, [courant?.id]);

  useEffect(() => {
    setChoix(proposees[0]?.id || "");
    setErreur("");
  }, [courant?.id, proposees.length]);

  function selectionner(id) {
    setParametres(id ? { id } : {});
    setMessage("");
  }

  const terme = recherche.trim().toLowerCase();
  const visibles = signalements
    .filter((s) => !onglet || s.statut === onglet)
    .filter((s) => !terme || [s.quartier, s.description, s.auteurNom, typesSignalement[s.type]].join(" ").toLowerCase().includes(terme));

  async function transmettre() {
    setEnvoi(true);
    try {
      await transmettreSignalement(courant.id, choix);
      const structure = structures.find((s) => s.id === choix);
      setMessage(`Signalement vérifié et transmis à ${structure ? structure.nom : "la structure"}.`);
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function confirmerRejet(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await rejeterSignalement(rejet.id, motif);
      setRejet(null);
      setMessage("Signalement rejeté. Le citoyen verra le statut « Rejeté ».");
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
          <h1>Signalements</h1>
          <p className="page-sous-titre">Vérifiez chaque signalement citoyen, puis transmettez-le à la structure du quartier ou rejetez-le.</p>
        </div>
      </div>

      <div className="barre-filtres">
        <div className="filtres">
          {onglets.map((o) => {
            const nombre = o.cle ? signalements.filter((s) => s.statut === o.cle).length : signalements.length;
            return (
              <button key={o.label} type="button" className={onglet === o.cle ? "actif" : ""} onClick={() => setOnglet(o.cle)}>
                {o.label} · {nombre}
              </button>
            );
          })}
        </div>
        <label className="recherche">
          <Search size={18} />
          <input
            type="search"
            placeholder="Quartier, auteur, description..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            aria-label="Rechercher un signalement"
          />
        </label>
      </div>

      <div className="grille-principale">
        <div>
          {visibles.length === 0 ? (
            <EtatVide titre="Aucun signalement" texte={onglet === "a_verifier" ? "Tous les signalements reçus ont été traités." : "Aucun signalement ne correspond à ce filtre."} />
          ) : (
            <div className="tableau-conteneur">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Signalement</th>
                    <th>Reçu le</th>
                    <th>Auteur</th>
                    <th>Fiabilité</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((s) => {
                    const n = niveau(s.fiabilite.score);
                    return (
                      <tr
                        key={s.id}
                        className={s.id === selection ? "cliquable selectionne" : "cliquable"}
                        onClick={() => selectionner(s.id)}
                      >
                        <td className="cellule-principale">
                          <strong>{typesSignalement[s.type]}</strong>
                          <small>
                            {s.quartier} · {volumes[s.taille]}
                          </small>
                        </td>
                        <td>{dateCourte(s.date)}</td>
                        <td>
                          {s.auteurNom}
                          {s.canal === "ussd" && <span className="canal-ussd">USSD</span>}
                        </td>
                        <td>
                          <span className="fiabilite">
                            <i style={{ background: n.couleur }}></i>
                            {s.fiabilite.score} · {n.label}
                          </span>
                        </td>
                        <td>
                          <Badge statut={s.statut} liste={statutsSignalement} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="panneau signalement-detail">
          {!courant && <EtatVide titre="Aucun signalement sélectionné" texte="Choisissez une ligne du tableau pour voir le détail et agir." />}
          {courant && (
            <>
              <div className="panneau-entete">
                <h2>
                  {typesSignalement[courant.type]} · {courant.quartier}
                </h2>
                <Badge statut={courant.statut} liste={statutsSignalement} />
              </div>

              {message && <p className="message message-ok">{message}</p>}

              {/^(data:|https?:)/.test(courant.photo) ? (
                <a className="signalement-image" href={courant.photo} target="_blank" rel="noreferrer">
                  <img src={courant.photo} alt={`Photo du signalement à ${courant.quartier}`} />
                  {courant.floute && <span>Visages et plaques floutés</span>}
                </a>
              ) : (
                <div className="signalement-photo">
                  <Camera size={22} />
                  <span>{courant.photo || "Aucune photo"}</span>
                </div>
              )}

              {/^(data:|https?:)/.test(courant.photoApres) && (
                <a className="signalement-image" href={courant.photoApres} target="_blank" rel="noreferrer">
                  <img src={courant.photoApres} alt={`Le lieu nettoyé à ${courant.quartier}`} />
                  <span>Après nettoyage</span>
                </a>
              )}

              {courant.photoReutilisee?.length > 0 && (
                <p className="message message-erreur">
                  Possible piège : la même photo a déjà servi pour {courant.photoReutilisee.length} autre(s) signalement(s) (
                  {courant.photoReutilisee
                    .slice(0, 3)
                    .map((x) => `${x.quartier}, ${new Date(x.date).toLocaleDateString("fr-FR")}`)
                    .join(" ; ")}
                  {courant.photoReutilisee.length > 3 ? " ..." : ""}).
                </p>
              )}

              {courant.position && (
                <CarteOuaga hauteur={180} cadrage={[[courant.position.lat, courant.position.lng]]}>
                  <CircleMarker
                    center={[courant.position.lat, courant.position.lng]}
                    radius={9}
                    pathOptions={{ color: couleursStatut[courant.statut].bord, weight: 2, fillColor: couleursStatut[courant.statut].remplissage, fillOpacity: 1 }}
                  />
                </CarteOuaga>
              )}

              <dl className="liste-cles">
                <dt>Auteur</dt>
                <dd>
                  {courant.auteurNom}
                  {courant.auteurTelephone && ` · ${courant.auteurTelephone}`}
                </dd>
                <dt>Reçu le</dt>
                <dd>{dateHeure(courant.date)}</dd>
                <dt>Taille</dt>
                <dd>{volumes[courant.taille]}</dd>
                {courant.description && (
                  <>
                    <dt>Précisions</dt>
                    <dd>{courant.description}</dd>
                  </>
                )}
                {courant.structureNom && (
                  <>
                    <dt>Structure</dt>
                    <dd>{courant.structureNom}</dd>
                  </>
                )}
                {courant.motifRejet && (
                  <>
                    <dt>Motif du rejet</dt>
                    <dd>{courant.motifRejet}</dd>
                  </>
                )}
              </dl>

              <div className="signalement-fiabilite">
                <div className="panneau-entete">
                  <span className="surtitre">Indice de fiabilité</span>
                  <strong>{courant.fiabilite.score} / 100</strong>
                </div>
                <div className="barre-progression">
                  <i style={{ width: `${courant.fiabilite.score}%`, background: niveau(courant.fiabilite.score).couleur }}></i>
                </div>
                <ul>
                  {courant.fiabilite.raisons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {courant.confirmations.length > 0 && (
                  <p className="champ-aide">
                    <Users size={14} /> Confirmé par {courant.confirmations.length} habitant(s) sur place.
                  </p>
                )}
              </div>

              {erreur && <p className="message message-erreur">{erreur}</p>}

              {(courant.statut === "a_verifier" || courant.statut === "verifie") && (
                <div className="signalement-actions">
                  <label className="champ">
                    Structure qui interviendra
                    <select value={choix} onChange={(e) => setChoix(e.target.value)}>
                      {proposees.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom} {s.quartiers.includes(courant.quartier) ? `· couvre ${courant.quartier}` : "· hors quartier"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="page-actions">
                    <button type="button" className="btn btn-primaire" onClick={transmettre} disabled={envoi || !choix}>
                      <Send size={16} /> Vérifier et transmettre
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => setRejet(courant)} disabled={envoi}>
                      <Ban size={16} /> Rejeter
                    </button>
                  </div>
                </div>
              )}

              <div>
                <p className="surtitre">Historique</p>
                <ol className="signalement-historique">
                  {courant.historique.map((h, i) => (
                    <li key={`${h.statut}-${i}`}>
                      <strong>{(statutsSignalement[h.statut] || { label: h.statut }).label}</strong>
                      <small>{dateHeure(h.date)}</small>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </aside>
      </div>

      {rejet && (
        <Dialogue titre="Rejeter ce signalement ?" onFermer={() => setRejet(null)}>
          <form className="signalement-rejet" onSubmit={confirmerRejet}>
            <div className="filtres">
              {motifs.map((m) => (
                <button key={m} type="button" className={motif === m ? "actif" : ""} onClick={() => setMotif(m)}>
                  {m}
                </button>
              ))}
            </div>
            <label className="champ">
              Motif communiqué au citoyen
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} />
            </label>
            <div className="dialogue-actions">
              <button type="button" className="btn btn-secondaire" onClick={() => setRejet(null)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-danger-plein" disabled={envoi}>
                Rejeter le signalement
              </button>
            </div>
          </form>
        </Dialogue>
      )}
    </section>
  );
}
