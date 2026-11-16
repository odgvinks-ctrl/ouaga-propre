import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, Marker, Tooltip } from "react-leaflet";
import { useActualisation } from "../hooks/useActualisation.js";
import { listerSignalements } from "../services/signalements.js";
import { listerPoints, etatRemplissage } from "../services/points.js";
import { getAbonnesCarte } from "../services/tableau.js";
import { statutsSignalement, typesSignalement, volumes } from "@modeles/statuts.js";
import { quartiers } from "@modeles/quartiers.js";
import { dateCourte } from "@donnees/format.js";
import { couleursStatut } from "../maps/couleurs.js";
import { iconePoint } from "../maps/icones.js";
import CarteOuaga from "../maps/CarteOuaga.jsx";
import Badge from "../components/Badge.jsx";
import EtatVide from "../components/EtatVide.jsx";
import "./CarteGlobale.css";

const statutsVisibles = ["a_verifier", "transmis", "pris_en_charge", "nettoye"];

export default function CarteGlobale() {
  const [signalements, setSignalements] = useState([]);
  const [points, setPoints] = useState([]);
  const [abonnes, setAbonnes] = useState([]);
  const [couches, setCouches] = useState({ depotoirs: true, points: true, abonnes: false });
  const [statuts, setStatuts] = useState(statutsVisibles);
  const [secteur, setSecteur] = useState("");
  const [selection, setSelection] = useState(null);

  async function charger() {
    const [s, p, a] = await Promise.all([listerSignalements(), listerPoints(), getAbonnesCarte()]);
    setSignalements(s);
    setPoints(p);
    setAbonnes(a);
  }

  useActualisation(charger, "carte");

  function basculerStatut(statut) {
    setStatuts(statuts.includes(statut) ? statuts.filter((s) => s !== statut) : [...statuts, statut]);
  }

  const dansSecteur = (q) => !secteur || q === secteur;
  const depotoirs = couches.depotoirs
    ? signalements.filter((s) => s.position && statuts.includes(s.statut === "verifie" ? "transmis" : s.statut) && dansSecteur(s.quartier))
    : [];
  const pointsVisibles = couches.points ? points.filter((p) => dansSecteur(p.quartier)) : [];
  const abonnesVisibles = couches.abonnes ? abonnes.filter((a) => dansSecteur(a.quartier)) : [];
  const cadrage = [...depotoirs, ...pointsVisibles, ...abonnesVisibles].map((x) => [x.position.lat, x.position.lng]);

  const choisi =
    selection?.type === "depotoir"
      ? signalements.find((s) => s.id === selection.id)
      : selection?.type === "point"
        ? points.find((p) => p.id === selection.id)
        : null;

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Carte globale</h1>
          <p className="page-sous-titre">Dépotoirs signalés, points de regroupement et abonnés à la pré-collecte.</p>
        </div>
      </div>

      <div className="carte-filtres panneau">
        <fieldset>
          <legend className="surtitre">Couches</legend>
          {[
            ["depotoirs", `Dépotoirs · ${depotoirs.length}`],
            ["points", `Points de regroupement · ${pointsVisibles.length}`],
            ["abonnes", `Domiciles abonnés · ${abonnesVisibles.length}`],
          ].map(([cle, label]) => (
            <label key={cle}>
              <input type="checkbox" checked={couches[cle]} onChange={(e) => setCouches({ ...couches, [cle]: e.target.checked })} />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset disabled={!couches.depotoirs}>
          <legend className="surtitre">Statut des dépotoirs</legend>
          {statutsVisibles.map((statut) => (
            <label key={statut}>
              <input type="checkbox" checked={statuts.includes(statut)} onChange={() => basculerStatut(statut)} />
              <i style={{ background: couleursStatut[statut].remplissage }}></i>
              {couleursStatut[statut].label}
            </label>
          ))}
        </fieldset>
        <label className="champ">
          Quartier
          <select value={secteur} onChange={(e) => setSecteur(e.target.value)}>
            <option value="">Toute la commune</option>
            {quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grille-principale">
        <div className="panneau carte-zone">
          <CarteOuaga hauteur={600} cadrage={cadrage}>
            {abonnesVisibles.map((a) => (
              <CircleMarker key={a.id} center={[a.position.lat, a.position.lng]} radius={5} pathOptions={{ color: "#FFFFFF", weight: 1.5, fillColor: "#202B25", fillOpacity: 1 }}>
                <Tooltip>
                  {a.citoyenNom} · abonné à {a.structureNom}
                </Tooltip>
              </CircleMarker>
            ))}
            {pointsVisibles.map((p) => (
              <Marker
                key={p.id}
                position={[p.position.lat, p.position.lng]}
                icon={iconePoint(etatRemplissage(p.remplissage).couleur, selection?.id === p.id)}
                eventHandlers={{ click: () => setSelection({ type: "point", id: p.id }) }}
              >
                <Tooltip>
                  {p.nom} · {p.remplissage} %
                </Tooltip>
              </Marker>
            ))}
            {depotoirs.map((s) => (
              <CircleMarker
                key={s.id}
                center={[s.position.lat, s.position.lng]}
                radius={selection?.id === s.id ? 12 : s.taille === "grand" ? 10 : 8}
                pathOptions={{ color: couleursStatut[s.statut].bord, weight: 2, fillColor: couleursStatut[s.statut].remplissage, fillOpacity: 1 }}
                eventHandlers={{ click: () => setSelection({ type: "depotoir", id: s.id }) }}
              >
                <Tooltip>
                  {typesSignalement[s.type]} · {couleursStatut[s.statut].label}
                </Tooltip>
              </CircleMarker>
            ))}
          </CarteOuaga>
          <div className="legende">
            {statutsVisibles.map((statut) => (
              <span key={statut}>
                <i style={{ background: couleursStatut[statut].remplissage }}></i>
                {couleursStatut[statut].label}
              </span>
            ))}
            <span>
              <i style={{ borderRadius: 3, background: "#00853F" }}></i>Point de regroupement
            </span>
            <span>
              <i style={{ background: "#202B25" }}></i>Domicile abonné
            </span>
          </div>
        </div>

        <aside className="panneau">
          {!choisi && <EtatVide titre="Sélectionnez un élément" texte="Cliquez sur un dépotoir ou un point de regroupement pour afficher son détail." />}
          {choisi && selection.type === "depotoir" && (
            <>
              <div className="panneau-entete">
                <h2>
                  {typesSignalement[choisi.type]} · {choisi.quartier}
                </h2>
                <Badge statut={choisi.statut} liste={statutsSignalement} />
              </div>
              <dl className="liste-cles">
                <dt>Signalé le</dt>
                <dd>{dateCourte(choisi.date)}</dd>
                <dt>Par</dt>
                <dd>{choisi.auteurNom}</dd>
                <dt>Taille</dt>
                <dd>{volumes[choisi.taille]}</dd>
                <dt>Structure</dt>
                <dd>{choisi.structureNom || "Non transmis"}</dd>
                <dt>Fiabilité</dt>
                <dd>{choisi.fiabilite.score} / 100</dd>
              </dl>
              <Link to={`/signalements?id=${choisi.id}`} className="btn btn-primaire">
                Ouvrir le signalement
              </Link>
            </>
          )}
          {choisi && selection.type === "point" && (
            <>
              <div className="panneau-entete">
                <h2>{choisi.nom}</h2>
                <span className={`badge ${etatRemplissage(choisi.remplissage).classe}`}>{etatRemplissage(choisi.remplissage).label}</span>
              </div>
              <dl className="liste-cles">
                <dt>Type</dt>
                <dd>{choisi.type}</dd>
                <dt>Quartier</dt>
                <dd>{choisi.quartier}</dd>
                <dt>Capacité</dt>
                <dd>{choisi.capacite} m³</dd>
                <dt>Remplissage</dt>
                <dd>{choisi.remplissage} %</dd>
                <dt>Gestionnaire</dt>
                <dd>{choisi.structureNom}</dd>
              </dl>
              <Link to={`/points?id=${choisi.id}`} className="btn btn-secondaire">
                Modifier le point
              </Link>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
