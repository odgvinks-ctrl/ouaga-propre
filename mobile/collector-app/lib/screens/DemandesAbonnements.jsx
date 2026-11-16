import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Phone, MapPin, CalendarDays, Wallet, MessageSquareQuote, Inbox } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getDemandesStructure, repondreDemande } from "@citoyen/services/abonnements.js";
import { statutsAbonnement, moyensPaiement } from "@citoyen/models/statuts.js";
import { prix, prenom, initiales } from "@citoyen/services/format.js";
import Badge from "@citoyen/widgets/Badge.jsx";
import EtatVide from "@citoyen/widgets/EtatVide.jsx";
import "@citoyen/screens/Ecran.css";
import "./DemandesAbonnements.css";

const SEUIL = 110;

const motifs = ["Secteur trop éloigné de nos tournées", "Plus de place dans nos tournées", "Repère trop vague, appelez-nous"];

function depuis(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`;
  return `il y a ${Math.round(minutes / 1440)} j`;
}

export default function DemandesAbonnements() {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [ecart, setEcart] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const [refus, setRefus] = useState(null);
  const [motif, setMotif] = useState(motifs[0]);
  const depart = useRef(null);

  async function charger() {
    setDemandes(await getDemandesStructure(user.id));
    setChargement(false);
  }

  useActualisation(charger, user.id);

  const aTraiter = demandes.filter((d) => d.statut === "en_attente");
  const traitees = demandes.filter((d) => d.statut !== "en_attente");
  const carte = aTraiter[0];

  async function repondre(demande, accepter, texte = "") {
    setEcart(accepter ? 520 : -520);
    try {
      await new Promise((resolve) => setTimeout(resolve, 220));
      await repondreDemande(demande.id, accepter, texte);
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEcart(0);
    }
  }

  function demanderRefus(demande) {
    setEcart(0);
    setMotif(motifs[0]);
    setRefus(demande);
  }

  async function confirmerRefus(e) {
    e.preventDefault();
    const demande = refus;
    setRefus(null);
    await repondre(demande, false, motif);
  }

  function handlePointerDown(e) {
    depart.current = e.clientX;
    setGlisse(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (depart.current === null) return;
    setEcart(e.clientX - depart.current);
  }

  function handlePointerUp() {
    if (depart.current === null) return;
    depart.current = null;
    setGlisse(false);
    if (ecart > SEUIL) repondre(carte, true);
    else if (ecart < -SEUIL) demanderRefus(carte);
    else setEcart(0);
  }

  return (
    <section className="ecran">
      <div>
        <h1>Demandes d'abonnement</h1>
        <p className="ecran-sous-titre">
          {aTraiter.length
            ? `${aTraiter.length} en attente de votre réponse`
            : "Vous acceptez ou refusez directement, sans passer par l'administration."}
        </p>
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}

      {!chargement && !carte && (
        <EtatVide icone={Inbox} titre="Tout est à jour" texte="Aucune nouvelle demande. Les prochaines apparaîtront ici." />
      )}

      {carte && (
        <>
          <div className="pile">
            <article
              key={carte.id}
              className={["pile-carte", glisse && "glisse", ecart > 40 && "vers-accepter", ecart < -40 && "vers-refuser"].filter(Boolean).join(" ")}
              style={{ transform: `translateX(${ecart}px)` }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="pile-tete">
                <span className="pile-avatar">{initiales(carte.citoyenNom)}</span>
                <div>
                  <h2>{carte.citoyenNom}</h2>
                  <p className="element-meta">Demande envoyée {depuis(carte.date)}</p>
                </div>
                <span className="compteur">
                  1/{aTraiter.length}
                </span>
              </div>
              <ul className="pile-details">
                <li>
                  <MapPin size={20} /> {carte.quartier}
                </li>
                <li>
                  <CalendarDays size={20} /> {carte.formule.nom} · {carte.formule.frequence}
                </li>
                <li>
                  <Wallet size={20} /> {prix(carte.formule.prix)} /mois · {moyensPaiement[carte.paiement]}
                </li>
                <li>
                  <MessageSquareQuote size={20} /> « {carte.repere} »
                </li>
              </ul>
            </article>
          </div>
          <div className="pile-boutons">
            <a href={`tel:${carte.citoyenTelephone}`} className="btn btn-secondaire">
              <Phone size={18} /> Appeler
            </a>
            <button type="button" className="btn btn-refuser" onClick={() => demanderRefus(carte)}>
              <X size={18} /> Refuser
            </button>
            <button type="button" className="btn btn-valider" onClick={() => repondre(carte, true)}>
              <Check size={18} /> Accepter
            </button>
          </div>
          <p className="pile-aide">Raccourci : glissez la fiche vers la droite pour accepter, vers la gauche pour refuser.</p>
        </>
      )}

      {traitees.length > 0 && <p className="section-titre">Déjà traitées</p>}
      <div className="liste">
        {traitees.map((d) => (
          <article key={d.id} className="element">
            <div className="element-haut">
              <h3>{d.citoyenNom}</h3>
              <Badge statut={d.statut} liste={statutsAbonnement} />
            </div>
            <p className="element-meta">
              {d.formule.nom} · {d.quartier}
            </p>
          </article>
        ))}
      </div>

      {refus &&
        createPortal(
          <div className="voile" onClick={() => setRefus(null)}>
            <form className="feuille" onSubmit={confirmerRefus} onClick={(e) => e.stopPropagation()}>
              <span className="poignee" aria-hidden="true"></span>
              <h2>Refuser {prenom(refus.citoyenNom)} ?</h2>
              <p className="element-meta">Le citoyen verra ce motif.</p>
              <div className="choix-groupe colonne">
                {motifs.map((m) => (
                  <button key={m} type="button" className={motif === m ? "choix actif" : "choix"} onClick={() => setMotif(m)}>
                    {m}
                  </button>
                ))}
              </div>
              <label className="champ">
                Ou écrivez le motif
                <textarea value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} />
              </label>
              <div className="element-actions">
                <button type="button" className="btn btn-secondaire" onClick={() => setRefus(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-refuser">
                  Confirmer le refus
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </section>
  );
}
