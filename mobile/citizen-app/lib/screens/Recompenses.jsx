import { useState } from "react";
import { createPortal } from "react-dom";
import { Leaf, Smartphone, Wifi, MessageSquare, Ticket, Gift } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesPoints } from "../services/signalements.js";
import { echangerPoints, getMesEchanges } from "../services/recompenses.js";
import { cadeaux, categoriesCadeau, operateurs, statutsEchange } from "../models/recompenses.js";
import { dateCourte } from "../services/format.js";
import Badge from "../widgets/Badge.jsx";
import EtatVide from "../widgets/EtatVide.jsx";
import "./Ecran.css";
import "./Recompenses.css";

const icones = { unites: Smartphone, mega: Wifi, sms: MessageSquare, bon: Ticket };

export default function Recompenses() {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [echanges, setEchanges] = useState([]);
  const [categorie, setCategorie] = useState("");
  const [choisi, setChoisi] = useState(null);
  const [form, setForm] = useState({ operateur: operateurs[0], numero: user.telephone });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const [s, e] = await Promise.all([getMesPoints(user.id), getMesEchanges(user.id)]);
    setScore(s);
    setEchanges(e);
  }

  useActualisation(charger, user.id);

  function ouvrir(cadeau) {
    setChoisi(cadeau);
    setForm({ operateur: operateurs[0], numero: user.telephone });
    setErreur("");
    setSucces("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      const echange = await echangerPoints(user.id, { cadeauCle: choisi.cle, ...form });
      setSucces(
        echange.code
          ? `Votre ${echange.label.toLowerCase()} est réservé. Code : ${echange.code}. Il sera actif après contrôle de la mairie.`
          : `Demande enregistrée : ${echange.label} sur le ${echange.numero} (${echange.operateur}). Envoi après contrôle de la mairie.`
      );
      setChoisi(null);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const solde = score ? score.solde : 0;
  const visibles = cadeaux.filter((c) => !categorie || c.categorie === categorie);

  return (
    <section className="ecran">
      <div>
        <h1>Mes points et cadeaux</h1>
        <p className="ecran-sous-titre">Échangez les points gagnés en signalant contre des unités, de l'internet, des SMS ou des bons de réduction.</p>
      </div>

      <div className="recompenses-solde">
        <Leaf size={22} />
        <div>
          <strong>{solde} points</strong>
          <small>
            {score && score.enAttente > 0 ? `+${score.enAttente} points en attente de vérification` : "Disponibles pour un échange"}
          </small>
        </div>
      </div>

      <div className="element recompenses-regles">
        <p className="section-titre">Comment gagner des points</p>
        <ul>
          <li>10 points par signalement vérifié par la mairie</li>
          <li>5 points de plus quand le lieu est nettoyé</li>
          <li>5 points quand vous confirmez un dépotoir déjà signalé</li>
        </ul>
        <p className="champ-aide">Un signalement rejeté ne rapporte aucun point.</p>
      </div>

      {succes && <p className="message message-ok">{succes}</p>}

      <div className="filtres">
        <button type="button" className={categorie === "" ? "actif" : ""} onClick={() => setCategorie("")}>
          Tout
        </button>
        {Object.entries(categoriesCadeau).map(([cle, label]) => (
          <button key={cle} type="button" className={categorie === cle ? "actif" : ""} onClick={() => setCategorie(cle)}>
            {label}
          </button>
        ))}
      </div>

      <div className="groupe">
        {visibles.map((c) => {
          const Icone = icones[c.categorie];
          const manque = c.cout - solde;
          return (
            <div key={c.cle} className="groupe-ligne recompenses-cadeau">
              <span className={`recompenses-icone ${c.categorie}`}>
                <Icone size={20} />
              </span>
              <span>
                <strong>{c.label}</strong>
                <small>{c.detail}</small>
                <small className="recompenses-cout">{c.cout} points</small>
              </span>
              {manque > 0 ? (
                <span className="recompenses-manque">Encore {manque} pts</span>
              ) : (
                <button type="button" className="btn btn-primaire" onClick={() => ouvrir(c)}>
                  Échanger
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="section-titre">Mes échanges</p>
      {echanges.length === 0 && <EtatVide icone={Gift} titre="Aucun échange pour l'instant" texte="Vos demandes de cadeaux et leur suivi apparaîtront ici." />}
      <div className="liste">
        {echanges.map((e) => (
          <article key={e.id} className="element">
            <div className="element-haut">
              <h3>{e.label}</h3>
              <Badge statut={e.statut} liste={statutsEchange} />
            </div>
            <p className="element-meta">
              {e.cout} points · {dateCourte(e.date)}
              {e.numero && ` · ${e.operateur} ${e.numero}`}
            </p>
            {e.code && <p className="recompenses-code">Code du bon : {e.code}</p>}
          </article>
        ))}
      </div>

      {choisi &&
        createPortal(
          <div className="voile" onClick={() => setChoisi(null)}>
            <form className="feuille" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
              <span className="poignee" aria-hidden="true"></span>
              <h2>{choisi.label}</h2>
              <p className="element-meta">
                {choisi.cout} points seront retirés de votre solde ({solde} points). La mairie contrôle chaque échange avant l'envoi.
              </p>
              {choisi.categorie !== "bon" && (
                <>
                  <div className="champ">
                    Opérateur
                    <div className="choix-groupe">
                      {operateurs.map((o) => (
                        <button key={o} type="button" className={form.operateur === o ? "choix actif" : "choix"} onClick={() => setForm({ ...form, operateur: o })}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="champ">
                    Numéro à recharger
                    <input type="tel" inputMode="numeric" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                  </label>
                </>
              )}
              {erreur && <p className="message message-erreur">{erreur}</p>}
              <div className="element-actions">
                <button type="button" className="btn btn-secondaire" onClick={() => setChoisi(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primaire" disabled={envoi}>
                  {envoi ? "Envoi..." : "Confirmer l'échange"}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </section>
  );
}
