import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, Tooltip } from "react-leaflet";
import { useActualisation } from "../hooks/useActualisation.js";
import { getTableauDeBord } from "../services/tableau.js";
import { typesSignalement } from "@modeles/statuts.js";
import { dateHeure } from "@donnees/format.js";
import { couleursStatut } from "../maps/couleurs.js";
import CarteOuaga from "../maps/CarteOuaga.jsx";
import BarresJours from "../components/BarresJours.jsx";
import EtatVide from "../components/EtatVide.jsx";
import "./TableauDeBord.css";

function depuis(iso) {
  const heures = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  if (heures < 1) return "à l'instant";
  if (heures < 48) return `il y a ${heures} h`;
  return `il y a ${Math.round(heures / 24)} j`;
}

export default function TableauDeBord() {
  const [donnees, setDonnees] = useState(null);

  async function charger() {
    setDonnees(await getTableauDeBord());
  }

  useActualisation(charger, "tableau");

  if (!donnees) return <p className="message message-info">Chargement...</p>;

  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const maxSecteur = Math.max(1, ...donnees.secteurs.map(([, n]) => n));

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Tableau de bord</h1>
          <p className="page-sous-titre">Situation de la commune, {aujourdhui}.</p>
        </div>
      </div>

      <div className="indicateurs">
        <Link to="/signalements" className={donnees.aVerifier.length ? "indicateur alerte" : "indicateur"}>
          <strong>{donnees.aVerifier.length}</strong>
          <span>Signalements à vérifier</span>
        </Link>
        <Link to="/carte" className="indicateur">
          <strong>{donnees.depotoirsActifs}</strong>
          <span>Dépotoirs actifs dont {donnees.enAttenteIntervention} en attente d'intervention</span>
        </Link>
        <div className="indicateur ok">
          <strong>{donnees.nettoyes30}</strong>
          <span>Lieux nettoyés sur 30 jours</span>
        </div>
        <Link to="/validation" className={donnees.structuresEnAttente.length ? "indicateur attente" : "indicateur"}>
          <strong>{donnees.structuresEnAttente.length}</strong>
          <span>Structures à valider · {donnees.structuresActives} actives</span>
        </Link>
        <Link to="/structures" className={donnees.vehiculesEnPanne ? "indicateur alerte" : "indicateur"}>
          <strong>
            {donnees.vehiculesEnPanne}/{donnees.vehicules}
          </strong>
          <span>Véhicules en panne</span>
        </Link>
      </div>

      <div className="grille-principale">
        <div className="tableau-colonne">
          <div className="panneau">
            <div className="panneau-entete">
              <h2>Carte des dépotoirs</h2>
              <Link to="/carte">Ouvrir la carte globale</Link>
            </div>
            <CarteOuaga hauteur={340} cadrage={donnees.carte.map((s) => [s.position.lat, s.position.lng])}>
              {donnees.carte.map((s) => (
                <CircleMarker
                  key={s.id}
                  center={[s.position.lat, s.position.lng]}
                  radius={8}
                  pathOptions={{ color: couleursStatut[s.statut].bord, weight: 2, fillColor: couleursStatut[s.statut].remplissage, fillOpacity: 1 }}
                >
                  <Tooltip>
                    {typesSignalement[s.type]} · {couleursStatut[s.statut].label}
                  </Tooltip>
                </CircleMarker>
              ))}
            </CarteOuaga>
            <div className="legende">
              {["a_verifier", "transmis", "pris_en_charge", "nettoye"].map((statut) => (
                <span key={statut}>
                  <i style={{ background: couleursStatut[statut].remplissage }}></i>
                  {couleursStatut[statut].label}
                </span>
              ))}
            </div>
          </div>

          <div className="grille-deux">
            <div className="panneau">
              <div className="panneau-entete">
                <h2>Signalements reçus</h2>
                <span className="surtitre">7 jours</span>
              </div>
              <BarresJours jours={donnees.jours} cle="signalements" couleur="#D71920" legende="Signalements reçus par jour" />
            </div>
            <div className="panneau">
              <div className="panneau-entete">
                <h2>Collectes réalisées</h2>
                <span className="surtitre">7 jours</span>
              </div>
              <BarresJours jours={donnees.jours} cle="collectes" legende="Collectes réalisées par jour" />
            </div>
          </div>
        </div>

        <div className="tableau-colonne">
          <div className="panneau">
            <div className="panneau-entete">
              <h2>À vérifier en priorité</h2>
              <Link to="/signalements">Tout voir</Link>
            </div>
            {donnees.aVerifier.length === 0 && <EtatVide titre="Aucun signalement en attente" texte="Les nouveaux signalements des citoyens apparaîtront ici." />}
            <ul className="tableau-liste">
              {donnees.aVerifier.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link to={`/signalements?id=${s.id}`}>
                    <strong>
                      {typesSignalement[s.type]} · {s.quartier}
                    </strong>
                    <small>Reçu {depuis(s.date)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="panneau">
            <div className="panneau-entete">
              <h2>Structures à valider</h2>
              <Link to="/validation">Tout voir</Link>
            </div>
            {donnees.structuresEnAttente.length === 0 && <EtatVide titre="Aucune inscription en attente" />}
            <ul className="tableau-liste">
              {donnees.structuresEnAttente.map((s) => (
                <li key={s.id}>
                  <Link to={`/validation?id=${s.id}`}>
                    <strong>{s.nom}</strong>
                    <small>{s.secteur}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="panneau">
            <div className="panneau-entete">
              <h2>Secteurs les plus touchés</h2>
            </div>
            {donnees.secteurs.length === 0 && <EtatVide titre="Aucun dépotoir actif" />}
            {donnees.secteurs.map(([secteur, nombre]) => (
              <div key={secteur} className="tableau-secteur">
                <span>{secteur}</span>
                <div className="barre-progression">
                  <i style={{ width: `${(nombre / maxSecteur) * 100}%`, background: "#D71920" }}></i>
                </div>
                <strong>{nombre}</strong>
              </div>
            ))}
            <p className="champ-aide">Dépotoirs vérifiés, transmis ou pris en charge. Mis à jour {dateHeure(new Date().toISOString())}.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
