import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerStructures } from "../services/structures.js";
import { changerStatutCompte } from "../services/utilisateurs.js";
import { dateCourte } from "@donnees/format.js";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";
import "./Structures.css";

const statuts = {
  actif: { label: "Active", classe: "statut-ok" },
  suspendu: { label: "Suspendue", classe: "statut-refus" },
  en_attente: { label: "À valider", classe: "statut-attente" },
  refuse: { label: "Refusée", classe: "statut-refus" },
};

export default function Structures() {
  const [structures, setStructures] = useState([]);
  const [filtre, setFiltre] = useState("actif");
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [erreur, setErreur] = useState("");

  async function charger() {
    setStructures(await listerStructures());
  }

  useActualisation(charger, "structures");

  const terme = recherche.trim().toLowerCase();
  const visibles = structures
    .filter((s) => (filtre ? s.statut === filtre : ["actif", "suspendu"].includes(s.statut)))
    .filter((s) => !terme || [s.nom, s.responsable, s.quartiers.join(" ")].join(" ").toLowerCase().includes(terme));
  const courant = structures.find((s) => s.id === selection) || null;

  async function confirmer() {
    try {
      await changerStatutCompte(confirmation.id, confirmation.statut);
      setConfirmation(null);
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Structures de pré-collecte</h1>
          <p className="page-sous-titre">Suivi de l'activité et des performances des GIE, entreprises et associations validés.</p>
        </div>
        <Link to="/validation" className="btn btn-secondaire">
          Inscriptions à valider · {structures.filter((s) => s.statut === "en_attente").length}
        </Link>
      </div>

      <div className="barre-filtres">
        <div className="filtres">
          {[
            ["actif", "Actives"],
            ["suspendu", "Suspendues"],
            ["", "Toutes"],
          ].map(([cle, label]) => (
            <button key={label} type="button" className={filtre === cle ? "actif" : ""} onClick={() => setFiltre(cle)}>
              {label}
            </button>
          ))}
        </div>
        <label className="recherche">
          <Search size={18} />
          <input type="search" placeholder="Nom, responsable, quartier..." value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher une structure" />
        </label>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}

      {visibles.length === 0 ? (
        <EtatVide titre="Aucune structure" texte="Aucune structure ne correspond à ce filtre." />
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Structure</th>
                <th>Quartiers</th>
                <th className="nombre">Abonnés</th>
                <th className="nombre">Demandes</th>
                <th className="nombre">Collectes 30 j</th>
                <th>Interventions nettoyées</th>
                <th className="nombre">Véhicules</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((s) => (
                <tr key={s.id} className={s.id === selection ? "cliquable selectionne" : "cliquable"} onClick={() => setSelection(s.id)}>
                  <td className="cellule-principale">
                    <strong>{s.nom}</strong>
                    <small>
                      {s.type} · {s.responsable}
                    </small>
                  </td>
                  <td>{s.quartiers.join(", ")}</td>
                  <td className="nombre">{s.abonnes}</td>
                  <td className="nombre">{s.demandesEnAttente ? <span className="compteur a-traiter">{s.demandesEnAttente}</span> : 0}</td>
                  <td className="nombre">{s.collectesFaites}</td>
                  <td>
                    {s.interventions ? (
                      <div className="structures-taux">
                        <div className="barre-progression">
                          <i style={{ width: `${s.tauxNettoyage}%` }}></i>
                        </div>
                        <span>
                          {s.nettoyes}/{s.interventions}
                        </span>
                      </div>
                    ) : (
                      <span className="champ-aide">Aucune</span>
                    )}
                  </td>
                  <td className="nombre">
                    {s.vehicules - s.vehiculesEnPanne}/{s.vehicules}
                    {s.vehiculesEnPanne > 0 && <small className="structures-panne"> {s.vehiculesEnPanne} en panne</small>}
                  </td>
                  <td>
                    <span className={`badge ${statuts[s.statut].classe}`}>{statuts[s.statut].label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {courant && (
        <div className="panneau">
          <div className="panneau-entete">
            <h2>{courant.nom}</h2>
            {courant.statut === "actif" && (
              <button type="button" className="btn btn-danger btn-petit" onClick={() => setConfirmation({ id: courant.id, nom: courant.nom, statut: "suspendu" })}>
                Suspendre
              </button>
            )}
            {courant.statut === "suspendu" && (
              <button type="button" className="btn btn-primaire btn-petit" onClick={() => setConfirmation({ id: courant.id, nom: courant.nom, statut: "actif" })}>
                Réactiver
              </button>
            )}
          </div>
          <div className="grille-deux">
            <dl className="liste-cles">
              <dt>Responsable</dt>
              <dd>{courant.responsable}</dd>
              <dt>Téléphone</dt>
              <dd>{courant.telephone}</dd>
              <dt>Enregistrement</dt>
              <dd>{courant.numeroEnregistrement}</dd>
              {courant.dateValidation && (
                <>
                  <dt>Validée le</dt>
                  <dd>{dateCourte(courant.dateValidation)}</dd>
                </>
              )}
            </dl>
            <dl className="liste-cles">
              <dt>Formules</dt>
              <dd>{courant.formules.length ? courant.formules.map((f) => f.nom).join(", ") : "Aucune publiée"}</dd>
              <dt>Équipe</dt>
              <dd>{courant.equipe} membre(s)</dd>
              <dt>Collectes en cours</dt>
              <dd>{courant.collectesEnCours}</dd>
            </dl>
          </div>
        </div>
      )}

      {confirmation && (
        <Dialogue titre={confirmation.statut === "suspendu" ? `Suspendre ${confirmation.nom} ?` : `Réactiver ${confirmation.nom} ?`} onFermer={() => setConfirmation(null)}>
          <p className="page-sous-titre">
            {confirmation.statut === "suspendu"
              ? "La structure n'aura plus accès à son espace et n'apparaîtra plus aux citoyens tant qu'elle est suspendue."
              : "La structure retrouve l'accès à son espace et redevient visible pour les citoyens."}
          </p>
          <div className="dialogue-actions">
            <button type="button" className="btn btn-secondaire" onClick={() => setConfirmation(null)}>
              Annuler
            </button>
            <button type="button" className={confirmation.statut === "suspendu" ? "btn btn-danger-plein" : "btn btn-primaire"} onClick={confirmer}>
              {confirmation.statut === "suspendu" ? "Suspendre" : "Réactiver"}
            </button>
          </div>
        </Dialogue>
      )}
    </section>
  );
}
