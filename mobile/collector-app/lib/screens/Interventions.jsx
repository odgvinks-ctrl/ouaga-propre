import { useState } from "react";
import { MapPin } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getSignalementsStructure, changerStatutSignalement } from "@citoyen/services/signalements.js";
import { statutsSignalement, typesSignalement, volumes } from "@citoyen/models/statuts.js";
import { dateCourte } from "@citoyen/services/format.js";
import Badge from "@citoyen/widgets/Badge.jsx";
import FeuilleConfirmation from "@citoyen/widgets/FeuilleConfirmation.jsx";
import "@citoyen/screens/Ecran.css";

function lienCarte(position) {
  return `https://www.openstreetmap.org/?mlat=${position.lat}&mlon=${position.lng}#map=18/${position.lat}/${position.lng}`;
}

export default function Interventions() {
  const { user } = useAuth();
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [aConfirmer, setAConfirmer] = useState(null);

  async function charger() {
    setSignalements(await getSignalementsStructure(user.id));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function changer(signalement, statut) {
    setAConfirmer(null);
    try {
      await changerStatutSignalement(signalement.id, statut);
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const alertes = signalements.filter((s) => s.statut === "transmis");
  const enCours = signalements.filter((s) => s.statut === "pris_en_charge");
  const terminees = signalements.filter((s) => s.statut === "nettoye").slice(0, 10);

  function carte(s, action) {
    return (
      <article key={s.id} className="element">
        <div className="element-haut">
          <h3>{typesSignalement[s.type]}</h3>
          {s.statut === "transmis" ? (
            <span className="badge statut-attente">{volumes[s.taille]}</span>
          ) : (
            <Badge statut={s.statut} liste={statutsSignalement} />
          )}
        </div>
        <p className="element-meta">
          {s.quartier} · signalé le {dateCourte(s.date)}
        </p>
        {s.description && <p className="element-meta">{s.description}</p>}
        {s.position && s.statut !== "nettoye" && (
          <a href={lienCarte(s.position)} target="_blank" rel="noreferrer noopener" className="element-meta">
            <MapPin size={14} /> Voir sur la carte
          </a>
        )}
        {action}
      </article>
    );
  }

  return (
    <section className="ecran">
      <div>
        <h1>Interventions</h1>
        <p className="ecran-sous-titre">Dépotoirs et caniveaux vérifiés par l'administration et transmis à votre structure.</p>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      <p className="section-titre">Alertes à prendre en charge ({alertes.length})</p>
      {!chargement && alertes.length === 0 && <p className="message message-vide">Aucune nouvelle alerte.</p>}
      <div className="liste">
        {alertes.map((s) =>
          carte(
            s,
            <button type="button" className="btn btn-primaire" onClick={() => changer(s, "pris_en_charge")}>
              Prendre en charge
            </button>
          )
        )}
      </div>

      <p className="section-titre">En cours ({enCours.length})</p>
      {!chargement && enCours.length === 0 && <p className="message message-vide">Aucune intervention en cours.</p>}
      <div className="liste">
        {enCours.map((s) =>
          carte(
            s,
            <button
              type="button"
              className="btn btn-valider"
              onClick={() => setAConfirmer(s)}
            >
              Lieu nettoyé
            </button>
          )
        )}
      </div>

      {terminees.length > 0 && <p className="section-titre">Terminées</p>}
      <div className="liste">{terminees.map((s) => carte(s, null))}</div>
      {aConfirmer && (
        <FeuilleConfirmation
          titre="Le lieu est-il nettoyé ?"
          texte="Le citoyen qui a signalé ce dépotoir sera informé que le lieu est propre."
          libelle="Confirmer le nettoyage"
          onAnnuler={() => setAConfirmer(null)}
          onConfirmer={() => changer(aConfirmer, "nettoye")}
        />
      )}
    </section>
  );
}
