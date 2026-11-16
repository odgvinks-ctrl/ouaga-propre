import { useState } from "react";
import { Pencil, Plus, Trash2, Wrench, Truck } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { statutsVehicule, typesVehicule } from "@citoyen/models/statuts.js";
import Badge from "@citoyen/widgets/Badge.jsx";
import EtatVide from "@citoyen/widgets/EtatVide.jsx";
import FeuilleConfirmation from "@citoyen/widgets/FeuilleConfirmation.jsx";
import { getVehicules, enregistrerVehicule, changerStatutVehicule, supprimerVehicule } from "../services/flotte.js";
import "@citoyen/screens/Ecran.css";

const vide = { id: "", nom: "", type: typesVehicule[0], immatriculation: "", capacite: "" };

export default function Vehicules() {
  const { user } = useAuth();
  const [vehicules, setVehicules] = useState([]);
  const [formulaire, setFormulaire] = useState(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  async function charger() {
    setVehicules(await getVehicules(user.id));
  }

  useActualisation(charger, user.id);

  function ouvrir(vehicule) {
    setFormulaire(vehicule ? { ...vehicule } : vide);
    setErreur("");
  }

  function modifier(e) {
    setFormulaire({ ...formulaire, [e.target.name]: e.target.value });
  }

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await enregistrerVehicule(user.id, formulaire);
      setFormulaire(null);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function agir(action, question) {
    if (question) {
      setConfirmation({ ...question, action });
      return;
    }
    try {
      await action();
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <section className="ecran">
      <div>
        <h1>Véhicules</h1>
        <p className="ecran-sous-titre">Tricycles, charrettes et camions de votre structure.</p>
      </div>

      {erreur && !formulaire && <p className="message message-erreur">{erreur}</p>}
      {vehicules.length === 0 && !formulaire && (
        <EtatVide icone={Truck} titre="Aucun véhicule" texte="Ajoutez vos tricycles, charrettes ou camions pour les affecter aux tournées." />
      )}

      <div className="liste">
        {vehicules.map((v) => (
          <article key={v.id} className="element">
            <div className="element-haut">
              <h3>{v.nom}</h3>
              <Badge statut={v.statut} liste={statutsVehicule} />
            </div>
            <p className="element-meta">
              {v.type}
              {v.immatriculation && ` · ${v.immatriculation}`}
              {v.capacite && ` · ${v.capacite}`}
            </p>
            <div className="element-actions">
              {v.statut === "en_panne" ? (
                <button type="button" className="btn btn-valider" onClick={() => agir(() => changerStatutVehicule(user.id, v.id, "disponible"))}>
                  Remis en service
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-refuser"
                  onClick={() => agir(() => changerStatutVehicule(user.id, v.id, "en_panne"), { titre: `Déclarer ${v.nom} en panne ?`, texte: "Le véhicule sera retiré des tournées jusqu'à sa remise en service.", libelle: "Déclarer la panne", danger: true })}
                >
                  <Wrench size={16} /> Déclarer une panne
                </button>
              )}
              {v.statut === "disponible" && (
                <button type="button" className="btn btn-secondaire" onClick={() => agir(() => changerStatutVehicule(user.id, v.id, "en_tournee"))}>
                  Départ en tournée
                </button>
              )}
              {v.statut === "en_tournee" && (
                <button type="button" className="btn btn-secondaire" onClick={() => agir(() => changerStatutVehicule(user.id, v.id, "disponible"))}>
                  Retour de tournée
                </button>
              )}
            </div>
            <div className="actions-discretes">
              <button type="button" onClick={() => ouvrir(v)}>
                <Pencil size={16} /> Modifier
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => agir(() => supprimerVehicule(user.id, v.id), { titre: `Supprimer ${v.nom} ?`, texte: "Cette action est définitive.", libelle: "Supprimer", danger: true })}
              >
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>

      {formulaire ? (
        <form className="formulaire element" onSubmit={envoyer}>
          <h3>{formulaire.id ? "Modifier le véhicule" : "Nouveau véhicule"}</h3>
          <label className="champ">
            Nom
            <input name="nom" value={formulaire.nom} onChange={modifier} placeholder="Ex. Tricycle 3" maxLength={40} />
          </label>
          <label className="champ">
            Type
            <select name="type" value={formulaire.type} onChange={modifier}>
              {typesVehicule.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="champ">
            Immatriculation (facultatif)
            <input name="immatriculation" value={formulaire.immatriculation} onChange={modifier} placeholder="Ex. 11 KL 2345" />
          </label>
          <label className="champ">
            Capacité
            <input name="capacite" value={formulaire.capacite} onChange={modifier} placeholder="Ex. 1,5 m³" />
          </label>
          {erreur && <p className="message message-erreur">{erreur}</p>}
          <div className="element-actions">
            <button type="submit" className="btn btn-primaire" disabled={envoi}>
              {envoi ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" className="btn btn-secondaire" onClick={() => setFormulaire(null)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-primaire btn-large" onClick={() => ouvrir(null)}>
          <Plus size={20} /> Ajouter un véhicule
        </button>
      )}
      {confirmation && (
        <FeuilleConfirmation
          titre={confirmation.titre}
          texte={confirmation.texte}
          libelle={confirmation.libelle}
          danger={confirmation.danger}
          onAnnuler={() => setConfirmation(null)}
          onConfirmer={() => {
            const action = confirmation.action;
            setConfirmation(null);
            agir(action);
          }}
        />
      )}
    </section>
  );
}
