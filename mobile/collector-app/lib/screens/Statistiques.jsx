import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getDemandesStructure } from "@citoyen/services/abonnements.js";
import { getCollectesStructure } from "@citoyen/services/collectes.js";
import { getSignalementsStructure } from "@citoyen/services/signalements.js";
import { prix } from "@citoyen/services/format.js";
import { getVehicules } from "../services/flotte.js";
import AnneauProgression from "../widgets/AnneauProgression.jsx";
import "@citoyen/screens/Ecran.css";
import "./Statistiques.css";

const JOUR = 86400000;

function debutJour(decalage) {
  const d = new Date(Date.now() - decalage * JOUR);
  d.setHours(0, 0, 0, 0);
  return d;
}

function serie(faites, jours, decalage = 0) {
  return Array.from({ length: jours }, (_, i) => {
    const debut = debutJour(decalage + jours - 1 - i);
    const fin = new Date(debut.getTime() + JOUR);
    return {
      date: debut,
      nombre: faites.filter((c) => {
        const d = new Date(c.datePrevue);
        return d >= debut && d < fin;
      }).length,
    };
  });
}

export default function Statistiques() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState(7);
  const [donnees, setDonnees] = useState(null);

  async function charger() {
    const [abonnements, collectes, signalements, vehicules] = await Promise.all([
      getDemandesStructure(user.id),
      getCollectesStructure(user.id),
      getSignalementsStructure(user.id),
      getVehicules(user.id),
    ]);
    setDonnees({ abonnements, collectes, signalements, vehicules });
  }

  useActualisation(charger, user.id);

  if (!donnees) {
    return (
      <section className="ecran">
        <p className="message message-vide">Chargement...</p>
      </section>
    );
  }

  const { abonnements, collectes, signalements, vehicules } = donnees;
  const faites = collectes.filter((c) => c.statut === "faite" && c.datePrevue);
  const jours = serie(faites, periode);
  const avant = serie(faites, periode, periode).reduce((t, j) => t + j.nombre, 0);
  const totalPeriode = jours.reduce((t, j) => t + j.nombre, 0);
  const evolution = avant ? Math.round(((totalPeriode - avant) / avant) * 100) : null;
  const maximum = Math.max(1, ...jours.map((j) => j.nombre));

  const actifs = abonnements.filter((a) => a.statut === "accepte");
  const traitees = abonnements.filter((a) => a.statut !== "en_attente");
  const nettoyes = signalements.filter((s) => s.statut === "nettoye").length;
  const parSecteur = {};
  faites.forEach((c) => {
    if (c.quartier) parSecteur[c.quartier] = (parSecteur[c.quartier] || 0) + 1;
  });
  const secteurs = Object.entries(parSecteur).sort((a, b) => b[1] - a[1]);
  const maxSecteur = Math.max(1, ...secteurs.map(([, n]) => n));

  const largeur = 326;
  const hauteur = 130;
  const pas = largeur / jours.length;
  const barre = Math.max(4, pas * 0.62);

  return (
    <section className="ecran">
      <h1>Statistiques</h1>
      <div className="stats-periode">
        {[7, 30].map((p) => (
          <button key={p} type="button" aria-pressed={periode === p} className={periode === p ? "actif" : ""} onClick={() => setPeriode(p)}>
            {p} jours
          </button>
        ))}
      </div>

      <div className="stats-bloc">
        <div className="element-haut">
          <span className="surtitre">Collectes réalisées</span>
          {evolution !== null && (
            <span className={evolution >= 0 ? "stats-evolution hausse" : "stats-evolution baisse"}>
              {evolution >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {evolution >= 0 ? "+" : ""}
              {evolution} %
            </span>
          )}
        </div>
        <strong className="stats-grand">{totalPeriode}</strong>
        <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur + 22}`} role="img" aria-label={`Collectes par jour sur ${periode} jours`}>
          <line x1="0" y1={hauteur} x2={largeur} y2={hauteur} stroke="#DCE2DE" />
          {jours.map((j, i) => {
            const h = (j.nombre / maximum) * (hauteur - 20);
            const dernier = i === jours.length - 1;
            const x = i * pas + (pas - barre) / 2;
            return (
              <g key={j.date.toISOString()}>
                <rect
                  x={x}
                  y={hauteur - Math.max(h, 3)}
                  width={barre}
                  height={Math.max(h, 3)}
                  rx={Math.min(6, barre / 2)}
                  fill={dernier ? "#00853F" : "#B8DCC8"}
                >
                  <title>
                    {j.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })} : {j.nombre}
                  </title>
                </rect>
                {periode === 7 && (
                  <text
                    x={x + barre / 2}
                    y={hauteur + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={dernier ? 800 : 600}
                    fill={dernier ? "#00853F" : "#4F5B54"}
                  >
                    {j.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="stats">
        <div className="stat stats-anneau">
          <AnneauProgression
            valeur={nettoyes}
            total={signalements.length}
            taille={100}
            legende={signalements.length ? `${Math.round((nettoyes / signalements.length) * 100)} %` : "0 %"}
          />
          <span>
            Lieux nettoyés · {nettoyes}/{signalements.length}
          </span>
        </div>
        <div className="stat">
          <strong>{actifs.length}</strong>
          <span>Abonnés actifs</span>
          <strong className="stats-moyen">{traitees.length ? Math.round((actifs.length / traitees.length) * 100) : 0} %</strong>
          <span>Demandes acceptées</span>
        </div>
        <div className="stat">
          <strong className="stats-moyen">{prix(actifs.reduce((t, a) => t + a.formule.prix, 0))}</strong>
          <span>Revenus mensuels attendus</span>
        </div>
        <div className="stat">
          <strong>
            {vehicules.filter((v) => v.statut !== "en_panne").length}/{vehicules.length}
          </strong>
          <span>Véhicules en service</span>
        </div>
      </div>

      <div className="stats-bloc">
        <span className="surtitre">Collectes par quartier</span>
        {secteurs.length === 0 && <p className="element-meta">Pas encore de collecte faite.</p>}
        {secteurs.map(([secteur, nombre]) => (
          <div key={secteur} className="stat-ligne">
            <span>{secteur}</span>
            <div className="stat-barre">
              <i style={{ width: `${(nombre / maxSecteur) * 100}%` }}></i>
            </div>
            <strong>{nombre}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
