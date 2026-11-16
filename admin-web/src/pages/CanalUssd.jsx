import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, PhoneOff, MessageSquare, Hash } from "lucide-react";
import { useActualisation } from "../hooks/useActualisation.js";
import { CODE_USSD, demarrer, repondre, getSms, getStatistiquesUssd, reference } from "../services/ussd.js";
import { statutsSignalement, typesSignalement } from "@modeles/statuts.js";
import { dateHeure } from "@donnees/format.js";
import Badge from "../components/Badge.jsx";
import EtatVide from "../components/EtatVide.jsx";
import "./CanalUssd.css";

const touches = [
  ["1", ""],
  ["2", "abc"],
  ["3", "def"],
  ["4", "ghi"],
  ["5", "jkl"],
  ["6", "mno"],
  ["7", "pqrs"],
  ["8", "tuv"],
  ["9", "wxyz"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
];

const numerosDemo = [
  { numero: "76543210", label: "Nouveau numéro" },
  { numero: "70112233", label: "Mariam (a un compte)" },
];

export default function CanalUssd() {
  const [telephone, setTelephone] = useState("76543210");
  const [composition, setComposition] = useState("");
  const [session, setSession] = useState(null);
  const [texte, setTexte] = useState("");
  const [reponse, setReponse] = useState("");
  const [attente, setAttente] = useState(false);
  const [onglet, setOnglet] = useState("appel");
  const [sms, setSms] = useState([]);
  const [lus, setLus] = useState(0);
  const [stats, setStats] = useState(null);

  async function charger() {
    const [messages, statistiques] = await Promise.all([getSms(telephone), getStatistiquesUssd()]);
    setSms(messages);
    setStats(statistiques);
  }

  useActualisation(charger, telephone, 3000);

  const enCours = Boolean(session);
  const nonLus = onglet === "sms" ? 0 : Math.max(0, sms.length - lus);

  function changerNumero(numero) {
    raccrocher();
    setTelephone(numero.replace(/\D/g, "").slice(0, 8));
    setLus(0);
  }

  function taper(touche) {
    if (attente) return;
    setOnglet("appel");
    if (enCours) setReponse((r) => r + touche);
    else {
      setTexte("");
      setComposition((c) => c + touche);
    }
  }

  async function appeler() {
    if (attente) return;
    setOnglet("appel");
    if (enCours) {
      setAttente(true);
      const resultat = await repondre(session, reponse);
      setAttente(false);
      setReponse("");
      setSession(resultat.session);
      setTexte(resultat.texte);
      return;
    }
    if (telephone.length !== 8) {
      setTexte("Saisissez d'abord le numéro qui appelle (8 chiffres).");
      return;
    }
    const resultat = demarrer(telephone, composition || CODE_USSD);
    setComposition("");
    setSession(resultat.session);
    setTexte(resultat.texte);
  }

  function raccrocher() {
    setSession(null);
    setTexte("");
    setReponse("");
    setComposition("");
  }

  function ouvrirSms() {
    setOnglet("sms");
    setLus(sms.length);
  }

  function envoyer(e) {
    e.preventDefault();
    appeler();
  }

  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Canal USSD et SMS</h1>
          <p className="page-sous-titre">
            Signaler avec n'importe quel téléphone, sans internet ni smartphone, en composant le {CODE_USSD}.
          </p>
        </div>
      </div>

      {stats && (
        <div className="indicateurs">
          <div className="indicateur alerte">
            <strong>{stats.total}</strong>
            <span>Signalements reçus par USSD</span>
          </div>
          <div className="indicateur attente">
            <strong>{stats.ceMois}</strong>
            <span>Ce mois-ci</span>
          </div>
          <div className="indicateur">
            <strong>{stats.numeros}</strong>
            <span>Numéros différents</span>
          </div>
          <div className="indicateur ok">
            <strong>{stats.nettoyes}</strong>
            <span>Lieux nettoyés</span>
          </div>
        </div>
      )}

      <div className="ussd-grille">
        <div className="ussd-colonne-telephone">
          <div className="champ">
            <label htmlFor="ussd-numero">Numéro qui appelle</label>
            <input
              id="ussd-numero"
              inputMode="numeric"
              value={telephone}
              onChange={(e) => changerNumero(e.target.value)}
              placeholder="8 chiffres"
            />
          </div>
          <div className="ussd-numeros">
            {numerosDemo.map((n) => (
              <button
                key={n.numero}
                type="button"
                className={telephone === n.numero ? "ussd-numero actif" : "ussd-numero"}
                onClick={() => changerNumero(n.numero)}
              >
                {n.numero} · {n.label}
              </button>
            ))}
          </div>

          <div className="ussd-telephone" aria-label="Simulateur de téléphone simple">
            <div className="ussd-haut">
              <span>{telephone || "--------"}</span>
              <div className="ussd-onglets">
                <button type="button" className={onglet === "appel" ? "actif" : ""} onClick={() => setOnglet("appel")}>
                  <Hash size={13} /> USSD
                </button>
                <button type="button" className={onglet === "sms" ? "actif" : ""} onClick={ouvrirSms}>
                  <MessageSquare size={13} /> SMS
                  {nonLus > 0 && <b>{nonLus}</b>}
                </button>
              </div>
            </div>

            <div className="ussd-ecran" aria-live="polite">
              {onglet === "sms" && (
                <div className="ussd-sms">
                  {!sms.length && <p className="ussd-vide">Aucun SMS de FASO NEERE pour ce numéro.</p>}
                  {sms.map((m) => (
                    <div key={m.id} className="ussd-bulle">
                      <p>{m.texte}</p>
                      <small>{dateHeure(m.date)}</small>
                    </div>
                  ))}
                </div>
              )}

              {onglet === "appel" && (
                <>
                  {attente && <p className="ussd-texte">Patientez...</p>}
                  {!attente && texte && <p className="ussd-texte">{texte}</p>}
                  {!attente && !texte && !enCours && (
                    <p className="ussd-vide">
                      Composez {CODE_USSD}
                      <br />
                      puis appuyez sur le bouton vert.
                    </p>
                  )}
                  {!enCours && composition && <p className="ussd-composition">{composition}</p>}
                  {enCours && !attente && (
                    <form className="ussd-reponse" onSubmit={envoyer}>
                      <input value={reponse} onChange={(e) => setReponse(e.target.value)} autoFocus aria-label="Votre réponse" />
                      <button type="submit">Envoyer</button>
                    </form>
                  )}
                </>
              )}
            </div>

            <div className="ussd-commandes">
              <button type="button" className="ussd-appel" onClick={appeler} aria-label={enCours ? "Envoyer" : "Appeler"}>
                <Phone size={18} />
              </button>
              <button
                type="button"
                className="ussd-effacer"
                onClick={() => (enCours ? setReponse((r) => r.slice(0, -1)) : setComposition((c) => c.slice(0, -1)))}
              >
                Effacer
              </button>
              <button type="button" className="ussd-raccrocher" onClick={raccrocher} aria-label="Raccrocher">
                <PhoneOff size={18} />
              </button>
            </div>

            <div className="ussd-clavier">
              {touches.map(([chiffre, lettres]) => (
                <button key={chiffre} type="button" onClick={() => taper(chiffre)}>
                  <strong>{chiffre}</strong>
                  <small>{lettres}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ussd-colonne-infos">
          <div className="panneau">
            <h2 className="ussd-titre">Pourquoi ce canal</h2>
            <ul className="ussd-points">
              <li>
                <strong>Aucun smartphone ni internet.</strong> Un simple téléphone à touches suffit, sur Orange, Moov Africa ou Telecel.
              </li>
              <li>
                <strong>Suivi par SMS.</strong> Le citoyen reçoit un SMS quand la mairie vérifie, quand une structure intervient et quand le lieu est nettoyé.
              </li>
              <li>
                <strong>Mêmes points, mêmes cadeaux.</strong> Les points s'échangent depuis le menu 4. S'il crée un compte plus tard avec ce numéro, tout est
                rattaché.
              </li>
              <li>
                <strong>Vérification renforcée.</strong> Sans photo ni GPS, ces signalements arrivent marqués « USSD » pour une vérification sur place.
              </li>
            </ul>
          </div>

          <div className="panneau">
            <div className="panneau-entete">
              <h2>Derniers signalements USSD</h2>
              <Link to="/signalements">Tout traiter</Link>
            </div>
            {stats && !stats.derniers.length && (
              <EtatVide titre="Aucun signalement USSD" texte={`Composez le ${CODE_USSD} sur le téléphone pour essayer.`} />
            )}
            {stats && stats.derniers.length > 0 && (
              <div className="tableau-conteneur">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Signalement</th>
                      <th>Numéro</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.derniers.map((s) => (
                      <tr key={s.id}>
                        <td>{reference(s.id)}</td>
                        <td className="cellule-principale">
                          <strong>{typesSignalement[s.type]}</strong>
                          <small>
                            {s.quartier} · {dateHeure(s.date)}
                          </small>
                        </td>
                        <td>{s.telephone}</td>
                        <td>
                          <Badge statut={s.statut} liste={statutsSignalement} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
