import { useState } from "react";
import { Printer, FileDown } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { getRapport, donneesExport } from "../services/rapports.js";
import { telechargerCsv, telechargerGeoJson } from "../services/exports.js";
import { statutsSignalement, typesSignalement, volumes, statutsAbonnement, statutsCollecte } from "@modeles/statuts.js";
import { dateCourte } from "@donnees/format.js";
import EtatVide from "../components/EtatVide.jsx";
import "./Rapports.css";

const periodes = [
  { jours: 7, label: "7 jours" },
  { jours: 30, label: "30 jours" },
  { jours: 90, label: "3 mois" },
  { jours: 0, label: "Depuis le début" },
];

const label = (liste, cle) => (liste[cle] ? liste[cle].label || liste[cle] : cle);

function jour(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

const exports = [
  {
    cle: "signalements",
    titre: "Signalements",
    description: "Tous les signalements avec statut, quartier, position et structure.",
    lancer: ({ base, nom }) =>
      telechargerCsv("signalements.csv", [
        { label: "Identifiant", valeur: (s) => s.id },
        { label: "Date", valeur: (s) => jour(s.date) },
        { label: "Type", valeur: (s) => typesSignalement[s.type] },
        { label: "Taille", valeur: (s) => volumes[s.taille] },
        { label: "Quartier", valeur: (s) => s.quartier },
        { label: "Latitude", valeur: (s) => s.position?.lat },
        { label: "Longitude", valeur: (s) => s.position?.lng },
        { label: "Statut", valeur: (s) => label(statutsSignalement, s.statut) },
        { label: "Auteur", valeur: (s) => nom(s.auteurId) },
        { label: "Structure", valeur: (s) => nom(s.structureId) },
      ], base.signalements),
  },
  {
    cle: "opendata",
    titre: "Signalements (open data)",
    description: "Version anonymisée, sans auteur ni téléphone, publiable en données ouvertes.",
    lancer: ({ base }) =>
      telechargerCsv("signalements-open-data.csv", [
        { label: "Date", valeur: (s) => jour(s.date) },
        { label: "Type", valeur: (s) => typesSignalement[s.type] },
        { label: "Taille", valeur: (s) => volumes[s.taille] },
        { label: "Quartier", valeur: (s) => s.quartier },
        { label: "Latitude", valeur: (s) => (s.position ? s.position.lat.toFixed(4) : "") },
        { label: "Longitude", valeur: (s) => (s.position ? s.position.lng.toFixed(4) : "") },
        { label: "Statut", valeur: (s) => label(statutsSignalement, s.statut) },
      ], base.signalements.filter((s) => s.statut !== "rejete")),
  },
  {
    cle: "geojson",
    titre: "Carte open data (GeoJSON, licence ODbL)",
    description: "Dépotoirs, caniveaux et points de regroupement, sans donnée personnelle. S'ouvre dans QGIS, uMap ou geojson.io.",
    lancer: ({ base }) =>
      telechargerGeoJson("faso-neere-open-data.geojson", [
        ...base.signalements
          .filter((s) => s.statut !== "rejete")
          .map((s) => ({
            position: s.position ? { lat: Number(s.position.lat.toFixed(4)), lng: Number(s.position.lng.toFixed(4)) } : null,
            proprietes: {
              categorie: "signalement",
              type: typesSignalement[s.type],
              taille: volumes[s.taille] || "",
              quartier: s.quartier,
              statut: label(statutsSignalement, s.statut),
              date: jour(s.date),
            },
          })),
        ...(base.pointsRegroupement || []).map((p) => ({
          position: p.position,
          proprietes: {
            categorie: "point de regroupement",
            nom: p.nom,
            type: p.type,
            quartier: p.quartier,
            capacite_m3: p.capacite,
            remplissage_pct: p.remplissage,
          },
        })),
      ]),
  },
  {
    cle: "structures",
    titre: "Structures de pré-collecte",
    description: "Identité, enregistrement, quartiers couverts et statut.",
    lancer: ({ base }) =>
      telechargerCsv("structures.csv", [
        { label: "Nom", valeur: (s) => (base.comptes.find((c) => c.id === s.id) || {}).nom },
        { label: "Type", valeur: (s) => s.type },
        { label: "Responsable", valeur: (s) => s.responsable },
        { label: "Téléphone", valeur: (s) => (base.comptes.find((c) => c.id === s.id) || {}).telephone },
        { label: "Enregistrement", valeur: (s) => s.numeroEnregistrement },
        { label: "Quartiers", valeur: (s) => s.quartiers.join(", ") },
        { label: "Statut", valeur: (s) => (base.comptes.find((c) => c.id === s.id) || {}).statut },
      ], base.structures),
  },
  {
    cle: "abonnements",
    titre: "Abonnements",
    description: "Demandes et abonnements des ménages par structure.",
    lancer: ({ base, nom }) =>
      telechargerCsv("abonnements.csv", [
        { label: "Date", valeur: (a) => jour(a.date) },
        { label: "Citoyen", valeur: (a) => nom(a.citoyenId) },
        { label: "Structure", valeur: (a) => nom(a.structureId) },
        { label: "Quartier", valeur: (a) => a.quartier },
        { label: "Statut", valeur: (a) => label(statutsAbonnement, a.statut) },
      ], base.abonnements),
  },
  {
    cle: "collectes",
    titre: "Collectes",
    description: "Passages demandés, planifiés et réalisés.",
    lancer: ({ base, nom }) =>
      telechargerCsv("collectes.csv", [
        { label: "Date prévue", valeur: (c) => jour(c.datePrevue) },
        { label: "Citoyen", valeur: (c) => nom(c.citoyenId) },
        { label: "Structure", valeur: (c) => nom(c.structureId) },
        { label: "Volume", valeur: (c) => volumes[c.volume] },
        { label: "Statut", valeur: (c) => label(statutsCollecte, c.statut) },
      ], base.collectes),
  },
  {
    cle: "points",
    titre: "Points de regroupement",
    description: "Position, capacité et remplissage des points suivis.",
    lancer: ({ base, nom }) =>
      telechargerCsv("points-regroupement.csv", [
        { label: "Nom", valeur: (p) => p.nom },
        { label: "Type", valeur: (p) => p.type },
        { label: "Quartier", valeur: (p) => p.quartier },
        { label: "Capacité (m3)", valeur: (p) => p.capacite },
        { label: "Remplissage (%)", valeur: (p) => p.remplissage },
        { label: "Latitude", valeur: (p) => p.position.lat },
        { label: "Longitude", valeur: (p) => p.position.lng },
        { label: "Gestionnaire", valeur: (p) => nom(p.structureId) },
      ], base.pointsRegroupement || []),
  },
];

export default function Rapports() {
  const [jours, setJours] = useState(30);
  const [rapport, setRapport] = useState(null);

  async function charger() {
    setRapport(await getRapport(jours));
  }

  useActualisation(charger, `rapport-${jours}`);

  const periode = periodes.find((p) => p.jours === jours);

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Rapports et exports</h1>
          <p className="page-sous-titre">Bilan d'activité imprimable et fichiers CSV pour les services de la mairie.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondaire" onClick={() => window.print()}>
            <Printer size={16} /> Imprimer ou enregistrer en PDF
          </button>
        </div>
      </div>

      <div className="filtres non-imprime">
        {periodes.map((p) => (
          <button key={p.label} type="button" className={jours === p.jours ? "actif" : ""} onClick={() => setJours(p.jours)}>
            {p.label}
          </button>
        ))}
      </div>

      {rapport && (
        <article className="panneau rapport">
          <div className="panneau-entete">
            <h2>Bilan d'activité · {periode.label.toLowerCase()}</h2>
            <span className="champ-aide">Édité le {dateCourte(new Date().toISOString())}</span>
          </div>

          <div className="indicateurs">
            <div className="indicateur">
              <strong>{rapport.recus}</strong>
              <span>Signalements reçus</span>
            </div>
            <div className="indicateur">
              <strong>{rapport.transmis}</strong>
              <span>Vérifiés et transmis</span>
            </div>
            <div className="indicateur">
              <strong>{rapport.rejetes}</strong>
              <span>Rejetés {rapport.recus ? `(${Math.round((rapport.rejetes / rapport.recus) * 100)} %)` : ""}</span>
            </div>
            <div className="indicateur">
              <strong>{rapport.nettoyes}</strong>
              <span>Lieux nettoyés</span>
            </div>
            <div className="indicateur">
              <strong>{rapport.delaiMoyen === null ? "-" : `${rapport.delaiMoyen.toLocaleString("fr-FR")} j`}</strong>
              <span>Délai moyen jusqu'au nettoyage</span>
            </div>
            <div className="indicateur">
              <strong>{rapport.collectes}</strong>
              <span>Collectes réalisées · {rapport.nouveauxAbonnes} nouveaux abonnés</span>
            </div>
          </div>

          <div className="grille-deux">
            <div>
              <p className="surtitre">Par quartier</p>
              {rapport.secteurs.length === 0 ? (
                <EtatVide titre="Aucun signalement sur la période" />
              ) : (
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Quartier</th>
                      <th className="nombre">Reçus</th>
                      <th className="nombre">Rejetés</th>
                      <th className="nombre">Nettoyés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rapport.secteurs.map(([secteur, v]) => (
                      <tr key={secteur}>
                        <td>{secteur}</td>
                        <td className="nombre">{v.recus}</td>
                        <td className="nombre">{v.rejetes}</td>
                        <td className="nombre">{v.nettoyes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <p className="surtitre">Par structure</p>
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Structure</th>
                    <th className="nombre">Interventions</th>
                    <th className="nombre">Nettoyés</th>
                    <th className="nombre">Collectes</th>
                    <th className="nombre">Abonnés</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.structures.map((s) => (
                    <tr key={s.nom}>
                      <td>{s.nom}</td>
                      <td className="nombre">{s.interventions}</td>
                      <td className="nombre">{s.nettoyes}</td>
                      <td className="nombre">{s.collectes}</td>
                      <td className="nombre">{s.abonnes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      )}

      <div className="panneau non-imprime">
        <div className="panneau-entete">
          <h2>Exports</h2>
          <span className="champ-aide">CSV ouvrables dans Excel · GeoJSON sous licence ODbL</span>
        </div>
        <ul className="rapports-exports">
          {exports.map((e) => (
            <li key={e.cle}>
              <div>
                <strong>{e.titre}</strong>
                <small>{e.description}</small>
              </div>
              <button type="button" className="btn btn-secondaire btn-petit" onClick={() => e.lancer(donneesExport())}>
                <FileDown size={15} /> Télécharger
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
