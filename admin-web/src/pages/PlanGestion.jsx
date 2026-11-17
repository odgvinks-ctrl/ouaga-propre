import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Circle, CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { CloudRain, House, Minus, Plus, Play, Pause, Loader2, Truck, SlidersHorizontal } from "lucide-react";
import CarteOuaga from "../maps/CarteOuaga.jsx";
import EtatVide from "../components/EtatVide.jsx";
import { lireParametres, ecrireParametres, simulerComplet, simulationComplete } from "../services/simulation.js";
import "./PlanGestion.css";

const COULEURS_CAMIONS = ["#00853F", "#1F6FB2", "#7A3DB8", "#C2410C", "#0F766E", "#A16207", "#BE185D", "#4D7C0F"];

function couleurRemplissage(pourcentage) {
  if (pourcentage >= 100) return "#A8141A";
  if (pourcentage >= 70) return "#E0A800";
  return "#00853F";
}

function nombre(valeur, decimales = 0) {
  return Number(valeur || 0).toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}

function Courbe({ jours, jour, cle, couleur, titre, unite = "" }) {
  const largeur = 420;
  const hauteur = 110;
  const maximum = Math.max(1, ...jours.map((j) => j[cle]));
  const x = (i) => 8 + (i * (largeur - 16)) / Math.max(1, jours.length - 1);
  const y = (v) => hauteur - 10 - (v / maximum) * (hauteur - 26);
  const trace = jours.map((j, i) => `${x(i).toFixed(1)},${y(j[cle]).toFixed(1)}`).join(" ");
  const courant = jours[jour - 1];
  return (
    <div className="plan-courbe">
      <div className="plan-courbe-titre">
        <span>{titre}</span>
        <strong>
          {nombre(courant?.[cle], 1)}
          {unite}
        </strong>
      </div>
      <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={titre}>
        <line x1="8" y1={hauteur - 10} x2={largeur - 8} y2={hauteur - 10} stroke="#DCE2DE" />
        <polyline points={trace} fill="none" stroke={couleur} strokeWidth="2.5" />
        {courant && <circle cx={x(jour - 1)} cy={y(courant[cle])} r="5" fill={couleur} />}
      </svg>
    </div>
  );
}

export default function PlanGestion() {
  const [parametres, setParametres] = useState(lireParametres);
  const [resultat, setResultat] = useState(null);
  const [calcul, setCalcul] = useState(false);
  const [erreur, setErreur] = useState("");
  const [jour, setJour] = useState(1);
  const [lecture, setLecture] = useState(false);
  const [duree, setDuree] = useState(null);
  const minuteur = useRef(null);

  useEffect(() => {
    if (!simulationComplete) return;
    ecrireParametres(parametres);
    setCalcul(true);
    const attente = setTimeout(() => {
      const debut = performance.now();
      simulerComplet(parametres)
        .then((reponse) => {
          setResultat(reponse);
          setDuree((performance.now() - debut) / 1000);
          setErreur("");
          setJour(reponse.jours.length);
        })
        .catch((err) => setErreur(err.message))
        .finally(() => setCalcul(false));
    }, 400);
    return () => clearTimeout(attente);
  }, [parametres]);

  useEffect(() => {
    if (!lecture || !resultat) return;
    minuteur.current = setInterval(() => {
      setJour((j) => {
        if (j >= resultat.jours.length) {
          setLecture(false);
          return j;
        }
        return j + 1;
      });
    }, 260);
    return () => clearInterval(minuteur.current);
  }, [lecture, resultat]);

  function changer(nom, valeur) {
    const suite = { ...parametres, [nom]: valeur };
    if (suite.camionsEnPanne > suite.camions) suite.camionsEnPanne = suite.camions;
    if (suite.camionsEnPanne < 0) suite.camionsEnPanne = 0;
    setParametres(suite);
  }

  function lire() {
    if (lecture) {
      setLecture(false);
      return;
    }
    if (resultat && jour >= resultat.jours.length) setJour(1);
    setLecture(true);
  }

  const plan = resultat?.plan;
  const courant = resultat?.jours[jour - 1];
  const cadrage = useMemo(() => (plan ? [...plan.quartiers.map((q) => q.position), plan.centre.position] : []), [plan]);
  const couleurCamion = useMemo(() => {
    const table = {};
    (plan?.tournees || []).forEach((t, i) => {
      t.points.forEach((id) => {
        table[id] = COULEURS_CAMIONS[i % COULEURS_CAMIONS.length];
      });
    });
    return table;
  }, [plan]);

  if (!simulationComplete) {
    return (
      <section className="page">
        <div className="page-entete">
          <div>
            <h1>Plan de gestion</h1>
          </div>
        </div>
        <EtatVide titre="Backend requis" texte="La simulation multi-agents et le calcul des tournées tournent sur le serveur. Lancez l'admin avec l'API." />
      </section>
    );
  }

  const r = resultat?.resume;

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Plan de gestion et simulation</h1>
          <p className="page-sous-titre">
            Points de regroupement, tournées optimisées et simulation des ménages, pré-collecteurs, camions, brigade Laabal et mairie sur{" "}
            {resultat?.jours.length || parametres.dureeJours || 30} jours.
          </p>
        </div>
        <div className="page-actions">
          <Link to="/simulation" className="btn btn-secondaire">
            <SlidersHorizontal size={16} /> Tous les paramètres
          </Link>
        </div>
      </div>

      <div className="panneau plan-evenements">
        <div className="plan-evenement">
          <span>
            <Truck size={18} /> Camions en panne
          </span>
          <div className="plan-compteur">
            <button type="button" aria-label="Un camion en panne de moins" onClick={() => changer("camionsEnPanne", parametres.camionsEnPanne - 1)}>
              <Minus size={16} />
            </button>
            <strong>
              {parametres.camionsEnPanne} / {parametres.camions}
            </strong>
            <button type="button" aria-label="Un camion en panne de plus" onClick={() => changer("camionsEnPanne", parametres.camionsEnPanne + 1)}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <label className={parametres.saisonPluies ? "plan-bascule actif" : "plan-bascule"}>
          <input type="checkbox" checked={parametres.saisonPluies} onChange={(e) => changer("saisonPluies", e.target.checked)} />
          <CloudRain size={18} /> Saison des pluies
        </label>
        <label className={parametres.nouveauQuartier ? "plan-bascule actif" : "plan-bascule"}>
          <input type="checkbox" checked={parametres.nouveauQuartier} onChange={(e) => changer("nouveauQuartier", e.target.checked)} />
          <House size={18} /> Nouveau quartier
        </label>
        <div className="plan-etat">
          {calcul ? (
            <span className="simulation-calcul">
              <Loader2 size={16} /> Recalcul du plan...
            </span>
          ) : (
            duree !== null && <span>Plan recalculé en {nombre(duree, 1)} s</span>
          )}
        </div>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}

      {r && (
        <div className="indicateurs">
          <div className={r.tauxCollecte >= 80 ? "indicateur ok" : r.tauxCollecte >= 50 ? "indicateur attente" : "indicateur alerte"}>
            <strong>{r.tauxCollecte} %</strong>
            <span>Déchets pré-collectés</span>
          </div>
          <div className={courant?.depotoirs_actifs > resultat.jours[0].depotoirs_actifs ? "indicateur alerte" : "indicateur"}>
            <strong>{courant?.depotoirs_actifs}</strong>
            <span>Dépotoirs sauvages au jour {jour}</span>
          </div>
          <div className="indicateur">
            <strong>{plan.tournees.length}</strong>
            <span>
              Tournées · {nombre(plan.tournees.reduce((t, x) => t + x.distance_km, 0))} km par jour
            </span>
          </div>
          <div className={plan.non_desservis.length ? "indicateur alerte" : "indicateur ok"}>
            <strong>{plan.non_desservis.length}</strong>
            <span>Points sans tournée</span>
          </div>
          <div className={r.coutMensuel > r.budgetMensuel ? "indicateur alerte" : "indicateur"}>
            <strong>{nombre(r.coutMensuel / 1000000, 1)} M</strong>
            <span>FCFA par mois · budget {nombre(r.budgetMensuel / 1000000, 1)} M</span>
          </div>
        </div>
      )}

      <div className="grille-principale plan-grille">
        <div className="panneau plan-carte">
          {!resultat ? (
            <EtatVide titre="Calcul en cours" texte="Les agents se mettent en place." />
          ) : (
            <>
              <CarteOuaga hauteur={540} cadrage={cadrage}>
                {plan.quartiers.map((q) => (
                  <Circle
                    key={q.nom}
                    center={q.position}
                    radius={q.rayon_m}
                    pathOptions={{ color: q.nouveau ? "#A8141A" : "#4F5B54", weight: 1, dashArray: q.nouveau ? "6 6" : null, fillOpacity: 0.04 }}
                  >
                    <Tooltip>
                      {q.nom} · {nombre(q.menages)} ménages
                    </Tooltip>
                  </Circle>
                ))}
                {plan.tournees.map((t, i) => (
                  <Polyline key={t.camion} positions={t.chemin} pathOptions={{ color: COULEURS_CAMIONS[i % COULEURS_CAMIONS.length], weight: 3, opacity: 0.8 }}>
                    <Tooltip sticky>
                      Camion {t.camion} · {t.points.length} points · {nombre(t.distance_km, 1)} km
                    </Tooltip>
                  </Polyline>
                ))}
                {courant.carte.map(([lat, lng, tonnes, quartier], i) => (
                  <CircleMarker
                    key={`d${i}`}
                    center={[lat, lng]}
                    radius={Math.min(12, 3 + Math.sqrt(tonnes) * 2.2)}
                    pathOptions={{ color: "#D71920", fillColor: "#D71920", fillOpacity: 0.55, weight: 1 }}
                  >
                    <Tooltip>
                      Dépotoir · {quartier} · {nombre(tonnes, 1)} t
                    </Tooltip>
                  </CircleMarker>
                ))}
                {plan.points.map((p) => {
                  const remplissage = courant.points[p.id] ?? 0;
                  const sansTournee = plan.non_desservis.includes(p.id);
                  return (
                    <CircleMarker
                      key={p.id}
                      center={p.position}
                      radius={8}
                      pathOptions={{
                        color: p.propose ? "#A8141A" : couleurCamion[p.id] || "#202B25",
                        weight: sansTournee || p.propose ? 3 : 2,
                        dashArray: p.propose ? "3 3" : null,
                        fillColor: couleurRemplissage(remplissage),
                        fillOpacity: 0.95,
                      }}
                    >
                      <Tooltip>
                        Point {p.id} · rempli à {remplissage} % · {nombre(p.charge_t, 1)} t/jour
                        {sansTournee ? " · aucune tournée" : ""}
                        {p.propose ? " · point proposé" : ""}
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
                <CircleMarker center={plan.centre.position} radius={10} pathOptions={{ color: "#202B25", fillColor: "#202B25", fillOpacity: 1 }}>
                  <Tooltip permanent direction="right">
                    {plan.centre.nom}
                  </Tooltip>
                </CircleMarker>
              </CarteOuaga>

              <div className="plan-temps">
                <button type="button" className="btn btn-secondaire btn-petit" onClick={lire} aria-label={lecture ? "Mettre en pause" : "Lire les jours"}>
                  {lecture ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <input
                  type="range"
                  min="1"
                  max={resultat.jours.length}
                  value={jour}
                  onChange={(e) => {
                    setLecture(false);
                    setJour(Number(e.target.value));
                  }}
                  aria-label="Jour de la simulation"
                />
                <strong>Jour {jour}</strong>
              </div>

              <div className="legende">
                <span>
                  <i style={{ background: "#00853F" }}></i> Point vide
                </span>
                <span>
                  <i style={{ background: "#E0A800" }}></i> Se remplit
                </span>
                <span>
                  <i style={{ background: "#A8141A" }}></i> Déborde
                </span>
                <span>
                  <i style={{ background: "#D71920", borderRadius: "50%" }}></i> Dépotoir sauvage
                </span>
                <span>
                  <i style={{ background: "#1F6FB2", height: 3 }}></i> Tournée d'un camion
                </span>
              </div>
            </>
          )}
        </div>

        <div className="plan-cote">
          {r && (
            <div className="panneau">
              <div className="panneau-entete">
                <h2>Diagnostic</h2>
              </div>
              {r.recommandations.length === 0 ? (
                <p className="plan-ok">Le dispositif tient : aucun débordement sur la période.</p>
              ) : (
                <ul className="plan-diagnostic">
                  {r.recommandations.map((texte) => (
                    <li key={texte}>{texte}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {plan && (
            <div className="panneau">
              <div className="panneau-entete">
                <h2>Tournées optimisées</h2>
              </div>
              {plan.tournees.length === 0 ? (
                <p className="plan-alerte">Aucun camion en service : aucun point n'est vidé.</p>
              ) : (
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Camion</th>
                      <th className="nombre">Points</th>
                      <th className="nombre">Distance</th>
                      <th className="nombre">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.tournees.map((t, i) => (
                      <tr key={t.camion}>
                        <td>
                          <span className="plan-pastille" style={{ background: COULEURS_CAMIONS[i % COULEURS_CAMIONS.length] }}></span>
                          Camion {t.camion}
                        </td>
                        <td className="nombre">{t.points.length}</td>
                        <td className="nombre">{nombre(t.distance_km, 1)} km</td>
                        <td className="nombre">{nombre(t.charge_t, 1)} t</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {plan.camions_en_panne > 0 && <p className="plan-note">{plan.camions_en_panne} camion(s) en panne retiré(s) du plan.</p>}
            </div>
          )}

          {resultat && (
            <div className="panneau">
              <Courbe jours={resultat.jours} jour={jour} cle="depotoirs_t" couleur="#D71920" titre="Déchets dans les dépotoirs" unite=" t" />
              <Courbe jours={resultat.jours} jour={jour} cle="non_collecte_t" couleur="#E0A800" titre="Non collecté ce jour" unite=" t" />
              <Courbe jours={resultat.jours} jour={jour} cle="nettoye_t" couleur="#00853F" titre="Nettoyé par la brigade" unite=" t" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
