import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RotateCcw, Save, CloudRain, House, Map as Carte, Loader2 } from "lucide-react";
import { parametresDefaut, simuler, enregistrerScenario, simulerComplet, simulationComplete, lireParametres, ecrireParametres, avecZone } from "../services/simulation.js";
import ChoixZone from "../components/ChoixZone.jsx";
import "./ParametresSimulation.css";

const goulots = {
  transport: "Le transport par camion limite la collecte.",
  "pre-collecte": "Les pré-collecteurs limitent la collecte.",
  abonnements: "Le nombre de ménages abonnés limite la collecte.",
};

function Curseur({ nom, label, min, max, pas = 1, unite = "", valeur, onChange }) {
  return (
    <label className="champ simulation-curseur">
      <span>
        {label}
        <strong>
          {valeur}
          {unite}
        </strong>
      </span>
      <input type="range" name={nom} min={min} max={max} step={pas} value={valeur} onChange={onChange} />
    </label>
  );
}

function nombre(valeur) {
  return valeur.toLocaleString("fr-FR");
}

export default function ParametresSimulation() {
  const [parametres, setParametres] = useState(lireParametres);
  const [resultat, setResultat] = useState(null);
  const [calcul, setCalcul] = useState(false);
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const r = simulationComplete && resultat ? resultat : simuler(parametres);

  useEffect(() => {
    ecrireParametres(parametres);
    if (!simulationComplete) return;
    setCalcul(true);
    const minuteur = setTimeout(() => {
      simulerComplet(parametres)
        .then((reponse) => setResultat(reponse.resume))
        .catch((err) => setErreur(err.message))
        .finally(() => setCalcul(false));
    }, 500);
    return () => clearTimeout(minuteur);
  }, [parametres]);

  function handleChange(e) {
    const { name, type, checked, value } = e.target;
    const suite = { ...parametres, [name]: type === "checkbox" ? checked : Number(value) };
    if (name === "camions" && suite.camionsEnPanne > suite.camions) suite.camionsEnPanne = suite.camions;
    setParametres(suite);
    setMessage("");
  }

  async function enregistrer(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await enregistrerScenario(nom, parametres, r);
      setMessage(`Scénario « ${nom.trim()} » enregistré.`);
      setNom("");
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const niveau = r.tauxCollecte >= 80 ? "ok" : r.tauxCollecte >= 50 ? "attente" : "alerte";

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Paramètres de simulation</h1>
          <p className="page-sous-titre">Modifiez les moyens et les événements : les résultats se recalculent immédiatement.</p>
        </div>
        <div className="page-actions">
          {calcul && (
            <span className="simulation-calcul">
              <Loader2 size={16} /> Simulation des agents...
            </span>
          )}
          <button type="button" className="btn btn-secondaire" onClick={() => setParametres(parametresDefaut)}>
            <RotateCcw size={16} /> Réinitialiser
          </button>
          {simulationComplete && (
            <button type="button" className="btn btn-primaire" onClick={() => navigate("/plan")}>
              <Carte size={16} /> Voir sur la carte
            </button>
          )}
        </div>
      </div>

      <div className="grille-principale simulation">
        <div className="panneau simulation-parametres">
          <fieldset>
            <legend className="surtitre">Population et abonnements</legend>
            <ChoixZone valeur={parametres.zone} onChoisir={(zone) => setParametres(avecZone(parametres, zone))} />
            <label className="champ">
              Ménages de la zone simulée
              <input type="number" name="menages" min="1000" max="800000" step="500" value={parametres.menages} onChange={handleChange} />
            </label>
            <Curseur nom="tauxAbonnement" label="Ménages abonnés à la pré-collecte" min={0} max={100} unite=" %" valeur={parametres.tauxAbonnement} onChange={handleChange} />
          </fieldset>

          <fieldset>
            <legend className="surtitre">Moyens de collecte</legend>
            <Curseur nom="preCollecteurs" label="Pré-collecteurs (tricycles)" min={0} max={Math.max(200, Math.ceil(parametres.menages / 200))} valeur={parametres.preCollecteurs} onChange={handleChange} />
            <Curseur nom="camions" label="Camions bennes" min={0} max={Math.max(30, Math.ceil(parametres.menages / 2000))} valeur={parametres.camions} onChange={handleChange} />
            <Curseur nom="camionsEnPanne" label="Camions en panne" min={0} max={parametres.camions} valeur={parametres.camionsEnPanne} onChange={handleChange} />
            <Curseur nom="rotations" label="Rotations par camion et par jour" min={1} max={4} valeur={parametres.rotations} onChange={handleChange} />
            <Curseur nom="frequencePassage" label="Passage chez un abonné tous les" min={1} max={7} unite=" j" valeur={parametres.frequencePassage} onChange={handleChange} />
          </fieldset>

          <fieldset>
            <legend className="surtitre">Brigade Laabal et signalements</legend>
            <Curseur nom="agentsBrigade" label="Agents de la brigade" min={0} max={Math.max(150, Math.ceil(parametres.menages / 250))} valeur={parametres.agentsBrigade} onChange={handleChange} />
            <Curseur nom="tauxPieges" label="Faux signalements" min={0} max={50} unite=" %" valeur={parametres.tauxPieges} onChange={handleChange} />
          </fieldset>

          <fieldset>
            <legend className="surtitre">Budget</legend>
            <label className="champ">
              Budget mensuel (FCFA)
              <input type="number" name="budgetMensuel" min="0" step="500000" value={parametres.budgetMensuel} onChange={handleChange} />
            </label>
          </fieldset>

          <fieldset>
            <legend className="surtitre">Événements</legend>
            <label className="simulation-interrupteur">
              <input type="checkbox" name="saisonPluies" checked={parametres.saisonPluies} onChange={handleChange} />
              <CloudRain size={18} />
              <span>
                <strong>Saison des pluies</strong>
                <small>Déchets plus lourds, routes plus lentes</small>
              </span>
            </label>
            <label className="simulation-interrupteur">
              <input type="checkbox" name="nouveauQuartier" checked={parametres.nouveauQuartier} onChange={handleChange} />
              <House size={18} />
              <span>
                <strong>Nouveau quartier</strong>
                <small>3 000 ménages supplémentaires, sans abonnement</small>
              </span>
            </label>
          </fieldset>
        </div>

        <div className="simulation-resultats">
          <div className={`panneau simulation-principal ${niveau}`}>
            <span className="surtitre">Déchets collectés</span>
            <strong>{r.tauxCollecte} %</strong>
            <div className="barre-progression">
              <i style={{ width: `${r.tauxCollecte}%`, background: niveau === "ok" ? "#00853F" : niveau === "attente" ? "#FCD116" : "#D71920" }}></i>
            </div>
            <p>
              {nombre(r.collecte)} t collectées sur {nombre(r.production)} t produites par jour par {nombre(r.menagesTotal)} ménages.
            </p>
            <p className="simulation-goulot">{goulots[r.goulot]}</p>
          </div>

          <div className="indicateurs">
            <div className={r.nonCollecte > 0 ? "indicateur alerte" : "indicateur"}>
              <strong>{nombre(r.nonCollecte)} t</strong>
              <span>Déchets non collectés par jour</span>
            </div>
            <div className="indicateur">
              <strong>{r.nouveauxDepotoirs}</strong>
              <span>Nouveaux dépotoirs par semaine</span>
            </div>
            <div className={r.delaiIntervention > 7 ? "indicateur alerte" : "indicateur"}>
              <strong>{r.delaiIntervention === null ? "-" : `${nombre(r.delaiIntervention)} j`}</strong>
              <span>Délai moyen d'intervention</span>
            </div>
            <div className="indicateur">
              <strong>{r.utilisationCamions} %</strong>
              <span>Utilisation des camions</span>
            </div>
            <div className="indicateur">
              <strong>{r.pieges}</strong>
              <span>Faux signalements à filtrer par semaine</span>
            </div>
            {r.coutMensuel !== undefined && (
              <div className={r.coutMensuel > r.budgetMensuel ? "indicateur alerte" : "indicateur ok"}>
                <strong>{nombre(Math.round(r.coutMensuel / 1000000))} M</strong>
                <span>Coût mensuel en FCFA (budget {nombre(Math.round(r.budgetMensuel / 1000000))} M)</span>
              </div>
            )}
          </div>

          <div className="panneau">
            <div className="panneau-entete">
              <h2>Recommandations</h2>
            </div>
            {r.recommandations.length === 0 ? (
              <p className="page-sous-titre">Les moyens actuels suffisent pour cette situation.</p>
            ) : (
              <ul className="simulation-recommandations">
                {r.recommandations.map((texte) => (
                  <li key={texte}>{texte}</li>
                ))}
              </ul>
            )}
          </div>

          <form className="panneau simulation-enregistrer" onSubmit={enregistrer}>
            <label className="champ">
              Enregistrer ce scénario pour le comparer
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Saison des pluies avec 2 camions en panne" maxLength={60} />
            </label>
            {erreur && <p className="message message-erreur">{erreur}</p>}
            {message && (
              <p className="message message-ok">
                {message} <Link to="/scenarios">Comparer les scénarios</Link>
              </p>
            )}
            <button type="submit" className="btn btn-primaire" disabled={envoi}>
              <Save size={16} /> Enregistrer le scénario
            </button>
          </form>

          <p className="champ-aide">
            Estimation simplifiée calculée dans le navigateur : 3 kg de déchets par ménage et par jour, 0,5 t par tricycle, 8 t par rotation de camion. Le moteur de simulation multi-agents du backend remplacera ce calcul.
          </p>
        </div>
      </div>
    </section>
  );
}
