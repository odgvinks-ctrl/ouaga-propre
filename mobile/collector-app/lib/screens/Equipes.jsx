import { useState } from "react";
import { Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { rolesEquipe } from "@citoyen/models/statuts.js";
import EtatVide from "@citoyen/widgets/EtatVide.jsx";
import FeuilleConfirmation from "@citoyen/widgets/FeuilleConfirmation.jsx";
import { getEquipes, getVehicules, enregistrerMembre, supprimerMembre } from "../services/flotte.js";
import "@citoyen/screens/Ecran.css";

const vide = { id: "", nom: "", role: rolesEquipe[1], telephone: "", vehiculeId: "" };

export default function Equipes() {
  const { user } = useAuth();
  const [membres, setMembres] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [formulaire, setFormulaire] = useState(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [aRetirer, setARetirer] = useState(null);

  async function charger() {
    const [m, v] = await Promise.all([getEquipes(user.id), getVehicules(user.id)]);
    setMembres(m);
    setVehicules(v);
  }

  useActualisation(charger, user.id);

  function ouvrir(membre) {
    setFormulaire(membre ? { ...membre } : vide);
    setErreur("");
  }

  function modifier(e) {
    setFormulaire({ ...formulaire, [e.target.name]: e.target.value });
  }

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await enregistrerMembre(user.id, formulaire);
      setFormulaire(null);
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(membre) {
    setARetirer(null);
    try {
      await supprimerMembre(user.id, membre.id);
      await charger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  const nomVehicule = (id) => vehicules.find((v) => v.id === id)?.nom || "Aucun véhicule";

  return (
    <section className="ecran">
      <div>
        <h1>Équipes</h1>
        <p className="ecran-sous-titre">Les personnes qui font les tournées et les interventions.</p>
      </div>

      {erreur && !formulaire && <p className="message message-erreur">{erreur}</p>}
      {membres.length === 0 && !formulaire && (
        <EtatVide icone={Users} titre="Aucun membre" texte="Ajoutez les pré-collecteurs, chauffeurs et chefs d'équipe." />
      )}

      <div className="liste">
        {membres.map((m) => (
          <article key={m.id} className="element">
            <div className="element-haut">
              <h3>{m.nom}</h3>
              <span className="etiquette">{m.role}</span>
            </div>
            <p className="element-meta">{nomVehicule(m.vehiculeId)}</p>
            <a href={`tel:${m.telephone}`} className="element-meta">
              <Phone size={14} /> {m.telephone}
            </a>
            <div className="actions-discretes">
              <button type="button" onClick={() => ouvrir(m)}>
                <Pencil size={16} /> Modifier
              </button>
              <button type="button" className="danger" onClick={() => setARetirer(m)}>
                <Trash2 size={16} /> Retirer
              </button>
            </div>
          </article>
        ))}
      </div>

      {formulaire ? (
        <form className="formulaire element" onSubmit={envoyer}>
          <h3>{formulaire.id ? "Modifier le membre" : "Nouveau membre"}</h3>
          <label className="champ">
            Nom complet
            <input name="nom" value={formulaire.nom} onChange={modifier} />
          </label>
          <label className="champ">
            Rôle
            <select name="role" value={formulaire.role} onChange={modifier}>
              {rolesEquipe.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="champ">
            Téléphone
            <input name="telephone" type="tel" inputMode="numeric" value={formulaire.telephone} onChange={modifier} />
          </label>
          <label className="champ">
            Véhicule
            <select name="vehiculeId" value={formulaire.vehiculeId} onChange={modifier}>
              <option value="">Aucun véhicule</option>
              {vehicules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nom}
                </option>
              ))}
            </select>
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
          <Plus size={20} /> Ajouter un membre
        </button>
      )}
      {aRetirer && (
        <FeuilleConfirmation
          titre={`Retirer ${aRetirer.nom} de l'équipe ?`}
          libelle="Retirer"
          danger
          onAnnuler={() => setARetirer(null)}
          onConfirmer={() => supprimer(aRetirer)}
        />
      )}
    </section>
  );
}
