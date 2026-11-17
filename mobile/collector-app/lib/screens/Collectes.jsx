import { useState } from "react";
import { Phone } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getCollectesStructure, planifierCollecte, terminerCollecte } from "@citoyen/services/collectes.js";
import FeuillePhotoPreuve from "@citoyen/widgets/FeuillePhotoPreuve.jsx";
import { statutsCollecte, volumes } from "@citoyen/models/statuts.js";
import { dateCourte, dateHeure } from "@citoyen/services/format.js";
import Badge from "@citoyen/widgets/Badge.jsx";
import "@citoyen/screens/Ecran.css";

function demainMatin() {
  const d = new Date(Date.now() + 86400000);
  d.setHours(9, 0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function Collectes() {
  const { user } = useAuth();
  const [collectes, setCollectes] = useState([]);
  const [dates, setDates] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [aTerminer, setATerminer] = useState(null);

  async function charger() {
    setCollectes(await getCollectesStructure(user.id));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  async function agir(action) {
    try {
      await action();
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const demandees = collectes.filter((c) => c.statut === "demandee");
  const planifiees = collectes.filter((c) => c.statut === "planifiee");
  const faites = collectes.filter((c) => c.statut === "faite").slice(0, 10);

  return (
    <section className="ecran">
      <div>
        <h1>Collectes</h1>
        <p className="ecran-sous-titre">Planifiez les passages demandés par vos abonnés.</p>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      <p className="section-titre">À planifier ({demandees.length})</p>
      {!chargement && demandees.length === 0 && <p className="message message-vide">Aucune nouvelle demande de collecte.</p>}
      <div className="liste">
        {demandees.map((c) => (
          <article key={c.id} className="element">
            <div className="element-haut">
              <h3>{c.citoyenNom}</h3>
              <span className="element-meta">{dateCourte(c.date)}</span>
            </div>
            <p className="element-meta">
              Volume {volumes[c.volume].toLowerCase()} · {c.quartier} · {c.repere}
            </p>
            <a href={`tel:${c.citoyenTelephone}`} className="element-meta">
              <Phone size={14} /> {c.citoyenTelephone}
            </a>
            <label className="champ">
              Date du passage
              <input
                type="datetime-local"
                value={dates[c.id] || demainMatin()}
                onChange={(e) => setDates({ ...dates, [c.id]: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="btn btn-primaire"
              onClick={() => agir(() => planifierCollecte(c.id, dates[c.id] || demainMatin()))}
            >
              Planifier
            </button>
          </article>
        ))}
      </div>

      <p className="section-titre">Planifiées ({planifiees.length})</p>
      {!chargement && planifiees.length === 0 && <p className="message message-vide">Rien de prévu.</p>}
      <div className="liste">
        {planifiees.map((c) => (
          <article key={c.id} className="element">
            <div className="element-haut">
              <h3>{c.citoyenNom}</h3>
              <Badge statut={c.statut} liste={statutsCollecte} />
            </div>
            <p className="element-meta">
              {dateHeure(c.datePrevue)} · {c.quartier} · {c.repere}
            </p>
            <button type="button" className="btn btn-valider" onClick={() => setATerminer(c)}>
              Poubelle vidée
            </button>
          </article>
        ))}
      </div>

      {faites.length > 0 && <p className="section-titre">Dernières collectes faites</p>}
      <div className="liste">
        {faites.map((c) => (
          <article key={c.id} className="element">
            <div className="element-haut">
              <h3>{c.citoyenNom}</h3>
              <Badge statut={c.statut} liste={statutsCollecte} />
            </div>
            <p className="element-meta">{dateCourte(c.datePrevue)}</p>
            {/^(data:|https?:|\/)/.test(c.photoPreuve) && <img className="photo-preuve" src={c.photoPreuve} alt="Preuve de la collecte" />}
          </article>
        ))}
      </div>
      {aTerminer && (
        <FeuillePhotoPreuve
          titre="Photo après la collecte"
          texte="Montrez la poubelle vidée ou le lieu propre. Elle sert de preuve au citoyen."
          libelle="Poubelle vidée"
          onAnnuler={() => setATerminer(null)}
          onConfirmer={async (photo) => {
            await terminerCollecte(aTerminer.id, photo);
            setATerminer(null);
            await agir(async () => {});
          }}
        />
      )}
    </section>
  );
}
