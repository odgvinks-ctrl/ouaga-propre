import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerScenarios, supprimerScenario } from "../services/simulation.js";
import { dateHeure } from "@donnees/format.js";
import EtatVide from "../components/EtatVide.jsx";
import Dialogue from "../components/Dialogue.jsx";
import "./ComparaisonScenarios.css";

const COULEURS = ["#00853F", "#202B25", "#8A958E"];

const indicateurs = [
  { cle: "tauxCollecte", label: "Déchets collectés", unite: " %", meilleur: "haut" },
  { cle: "nonCollecte", label: "Déchets non collectés par jour", unite: " t", meilleur: "bas" },
  { cle: "nouveauxDepotoirs", label: "Nouveaux dépotoirs par semaine", unite: "", meilleur: "bas" },
  { cle: "delaiIntervention", label: "Délai moyen d'intervention", unite: " j", meilleur: "bas" },
  { cle: "utilisationCamions", label: "Utilisation des camions", unite: " %", meilleur: "" },
  { cle: "pieges", label: "Faux signalements par semaine", unite: "", meilleur: "bas" },
];

const parametresAffiches = [
  { cle: "menages", label: "Ménages" },
  { cle: "tauxAbonnement", label: "Ménages abonnés", unite: " %" },
  { cle: "preCollecteurs", label: "Pré-collecteurs" },
  { cle: "camions", label: "Camions" },
  { cle: "camionsEnPanne", label: "Camions en panne" },
  { cle: "agentsBrigade", label: "Agents de la brigade" },
  { cle: "saisonPluies", label: "Saison des pluies" },
  { cle: "nouveauQuartier", label: "Nouveau quartier" },
];

function afficher(valeur, unite = "") {
  if (valeur === true) return "Oui";
  if (valeur === false) return "Non";
  if (valeur === null || valeur === undefined) return "-";
  return `${typeof valeur === "number" ? valeur.toLocaleString("fr-FR") : valeur}${unite}`;
}

export default function ComparaisonScenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [choisis, setChoisis] = useState([]);
  const [aSupprimer, setASupprimer] = useState(null);

  async function charger() {
    const liste = await listerScenarios();
    setScenarios(liste);
    setChoisis((actuels) => {
      const valides = actuels.filter((id) => liste.some((s) => s.id === id));
      return valides.length ? valides : liste.slice(0, 3).map((s) => s.id);
    });
  }

  useActualisation(charger, "scenarios");

  function basculer(id) {
    if (choisis.includes(id)) setChoisis(choisis.filter((c) => c !== id));
    else if (choisis.length < 3) setChoisis([...choisis, id]);
  }

  async function supprimer() {
    await supprimerScenario(aSupprimer.id);
    setASupprimer(null);
    await charger();
  }

  const compares = choisis.map((id) => scenarios.find((s) => s.id === id)).filter(Boolean);

  function classe(indicateur, valeur) {
    if (!indicateur.meilleur || compares.length < 2 || valeur === null) return "";
    const valeurs = compares.map((s) => s.resultats[indicateur.cle]).filter((v) => v !== null);
    const cible = indicateur.meilleur === "haut" ? Math.max(...valeurs) : Math.min(...valeurs);
    return valeur === cible && new Set(valeurs).size > 1 ? "comparaison-meilleur" : "";
  }

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Comparaison de scénarios</h1>
          <p className="page-sous-titre">Choisissez jusqu'à trois scénarios enregistrés pour comparer leurs résultats.</p>
        </div>
        <div className="page-actions">
          <Link to="/simulation" className="btn btn-primaire">
            Créer un scénario
          </Link>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <EtatVide titre="Aucun scénario enregistré" texte="Réglez les paramètres de simulation puis enregistrez le scénario pour le retrouver ici.">
          <Link to="/simulation" className="btn btn-secondaire">
            Aller aux paramètres de simulation
          </Link>
        </EtatVide>
      ) : (
        <>
          <div className="tableau-conteneur">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Comparer</th>
                  <th>Scénario</th>
                  <th>Créé le</th>
                  <th className="nombre">Collecte</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.id} className={choisis.includes(s.id) ? "selectionne" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        className="comparaison-case"
                        checked={choisis.includes(s.id)}
                        disabled={!choisis.includes(s.id) && choisis.length >= 3}
                        onChange={() => basculer(s.id)}
                        aria-label={`Comparer ${s.nom}`}
                      />
                    </td>
                    <td>
                      <strong>{s.nom}</strong>
                    </td>
                    <td>{dateHeure(s.date)}</td>
                    <td className="nombre">{s.resultats.tauxCollecte} %</td>
                    <td>
                      <button type="button" className="btn btn-danger btn-petit" onClick={() => setASupprimer(s)}>
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {compares.length > 0 && (
            <>
              <div className="panneau">
                <div className="panneau-entete">
                  <h2>Déchets collectés</h2>
                </div>
                {compares.map((s, i) => (
                  <div key={s.id} className="comparaison-barre">
                    <span>{s.nom}</span>
                    <div className="barre-progression">
                      <i style={{ width: `${s.resultats.tauxCollecte}%`, background: COULEURS[i] }}></i>
                    </div>
                    <strong>{s.resultats.tauxCollecte} %</strong>
                  </div>
                ))}
              </div>

              <div className="tableau-conteneur">
                <table className="tableau comparaison">
                  <thead>
                    <tr>
                      <th>Indicateur</th>
                      {compares.map((s, i) => (
                        <th key={s.id} className="nombre">
                          <i style={{ background: COULEURS[i] }}></i>
                          {s.nom}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {indicateurs.map((ind) => (
                      <tr key={ind.cle}>
                        <td>{ind.label}</td>
                        {compares.map((s) => (
                          <td key={s.id} className={`nombre ${classe(ind, s.resultats[ind.cle])}`}>
                            {afficher(s.resultats[ind.cle], ind.unite)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="comparaison-separation">
                      <td colSpan={compares.length + 1}>Paramètres</td>
                    </tr>
                    {parametresAffiches.map((p) => (
                      <tr key={p.cle}>
                        <td>{p.label}</td>
                        {compares.map((s) => (
                          <td key={s.id} className="nombre">
                            {afficher(s.parametres[p.cle], p.unite)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {compares.length > 1 && <p className="champ-aide">La meilleure valeur de chaque indicateur est mise en avant en vert.</p>}
            </>
          )}
        </>
      )}

      {aSupprimer && (
        <Dialogue titre={`Supprimer « ${aSupprimer.nom} » ?`} onFermer={() => setASupprimer(null)}>
          <p className="page-sous-titre">Le scénario sera retiré de la comparaison. Cette action est définitive.</p>
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
