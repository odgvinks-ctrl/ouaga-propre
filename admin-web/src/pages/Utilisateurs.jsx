import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerUtilisateurs, changerStatutCompte } from "../services/utilisateurs.js";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";

const roles = {
  citoyen: "Citoyen",
  structure: "Structure",
  admin: "Administrateur",
};

const statuts = {
  actif: { label: "Actif", classe: "statut-ok" },
  suspendu: { label: "Suspendu", classe: "statut-refus" },
  en_attente: { label: "À valider", classe: "statut-attente" },
  refuse: { label: "Refusé", classe: "statut-refus" },
};

export default function Utilisateurs() {
  const [comptes, setComptes] = useState([]);
  const [role, setRole] = useState("");
  const [recherche, setRecherche] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [erreur, setErreur] = useState("");

  async function charger() {
    setComptes(await listerUtilisateurs());
  }

  useActualisation(charger, "utilisateurs");

  const terme = recherche.trim().toLowerCase();
  const visibles = comptes
    .filter((c) => !role || c.role === role)
    .filter((c) => !terme || [c.nom, c.telephone, c.secteur].join(" ").toLowerCase().includes(terme));

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
          <h1>Utilisateurs</h1>
          <p className="page-sous-titre">
            {comptes.filter((c) => c.role === "citoyen").length} citoyens et {comptes.filter((c) => c.role === "structure").length} structures inscrits.
          </p>
        </div>
      </div>

      <div className="barre-filtres">
        <div className="filtres">
          {[
            ["", "Tous"],
            ["citoyen", "Citoyens"],
            ["structure", "Structures"],
            ["admin", "Administrateurs"],
          ].map(([cle, label]) => (
            <button key={label} type="button" className={role === cle ? "actif" : ""} onClick={() => setRole(cle)}>
              {label}
            </button>
          ))}
        </div>
        <label className="recherche">
          <Search size={18} />
          <input type="search" placeholder="Nom, téléphone, quartier..." value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un utilisateur" />
        </label>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}

      {visibles.length === 0 ? (
        <EtatVide titre="Aucun utilisateur" texte="Aucun compte ne correspond à cette recherche." />
      ) : (
        <div className="tableau-conteneur">
          <table className="tableau">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Quartier</th>
                <th className="nombre">Signalements</th>
                <th>Abonnement</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nom}</strong>
                  </td>
                  <td>{c.telephone}</td>
                  <td>{roles[c.role]}</td>
                  <td>{c.secteur || "-"}</td>
                  <td className="nombre">
                    {c.signalements}
                    {c.rejetes > 0 && <small className="champ-aide"> · {c.rejetes} rejeté(s)</small>}
                  </td>
                  <td>{c.abonnement || "-"}</td>
                  <td>
                    <span className={`badge ${(statuts[c.statut] || statuts.actif).classe}`}>{(statuts[c.statut] || statuts.actif).label}</span>
                  </td>
                  <td>
                    {c.role === "admin" && <span className="champ-aide">-</span>}
                    {c.role !== "admin" && c.statut === "en_attente" && (
                      <Link to={`/validation?id=${c.id}`} className="btn btn-secondaire btn-petit">
                        Contrôler
                      </Link>
                    )}
                    {c.role !== "admin" && c.statut === "actif" && (
                      <button type="button" className="btn btn-danger btn-petit" onClick={() => setConfirmation({ id: c.id, nom: c.nom, statut: "suspendu" })}>
                        Suspendre
                      </button>
                    )}
                    {c.role !== "admin" && c.statut === "suspendu" && (
                      <button type="button" className="btn btn-secondaire btn-petit" onClick={() => setConfirmation({ id: c.id, nom: c.nom, statut: "actif" })}>
                        Réactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmation && (
        <Dialogue titre={confirmation.statut === "suspendu" ? `Suspendre ${confirmation.nom} ?` : `Réactiver ${confirmation.nom} ?`} onFermer={() => setConfirmation(null)}>
          <p className="page-sous-titre">
            {confirmation.statut === "suspendu"
              ? "Le compte ne pourra plus se connecter à l'application jusqu'à sa réactivation."
              : "Le compte pourra de nouveau se connecter."}
          </p>
          <div className="dialogue-actions">
            <button type="button" className="btn btn-secondaire" onClick={() => setConfirmation(null)}>
              Annuler
            </button>
            <button type="button" className={confirmation.statut === "suspendu" ? "btn btn-danger-plein" : "btn btn-primaire"} onClick={confirmer}>
              {confirmation.statut === "suspendu" ? "Suspendre le compte" : "Réactiver le compte"}
            </button>
          </div>
        </Dialogue>
      )}
    </section>
  );
}
