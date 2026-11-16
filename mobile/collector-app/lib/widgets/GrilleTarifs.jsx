import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { getStructure, enregistrerFormule, supprimerFormule } from "@citoyen/services/structures.js";
import { prix } from "@citoyen/services/format.js";
import FeuilleConfirmation from "@citoyen/widgets/FeuilleConfirmation.jsx";
import "@citoyen/screens/Ecran.css";

const vide = { id: "", nom: "", prix: "", frequence: "" };

export default function GrilleTarifs() {
  const { user } = useAuth();
  const [formules, setFormules] = useState([]);
  const [formulaire, setFormulaire] = useState(null);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);

  useEffect(() => {
    getStructure(user.id).then((s) => setFormules(s.formules));
  }, [user.id]);

  function ouvrir(formule) {
    setFormulaire(formule ? { ...formule, prix: String(formule.prix) } : vide);
    setErreur("");
  }

  function modifier(e) {
    setFormulaire({ ...formulaire, [e.target.name]: e.target.value });
  }

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      const s = await enregistrerFormule(user.id, formulaire);
      setFormules(s.formules);
      setFormulaire(null);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(formule) {
    setASupprimer(null);
    try {
      const s = await supprimerFormule(user.id, formule.id);
      setFormules(s.formules);
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="formulaire">
      <p className="ecran-sous-titre">Les citoyens choisissent une de ces formules quand ils s'abonnent.</p>

      {formules.length === 0 && !formulaire && <p className="message message-vide">Aucune formule pour le moment.</p>}

      <div className="liste">
        {formules.map((f) => (
          <article key={f.id} className="element">
            <div className="element-haut">
              <h3>{f.nom}</h3>
              <strong>{prix(f.prix)}</strong>
            </div>
            <p className="element-meta">{f.frequence} · par mois</p>
            <div className="actions-discretes">
              <button type="button" onClick={() => ouvrir(f)}>
                <Pencil size={16} /> Modifier
              </button>
              <button type="button" className="danger" onClick={() => setASupprimer(f)}>
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>

      {formulaire ? (
        <form className="formulaire element" onSubmit={envoyer}>
          <h3>{formulaire.id ? "Modifier la formule" : "Nouvelle formule"}</h3>
          <label className="champ">
            Nom
            <input name="nom" value={formulaire.nom} onChange={modifier} placeholder="Ex. Standard" maxLength={40} />
          </label>
          <label className="champ">
            Prix par mois (FCFA)
            <input name="prix" type="number" inputMode="numeric" value={formulaire.prix} onChange={modifier} placeholder="2000" />
          </label>
          <label className="champ">
            Fréquence
            <input name="frequence" value={formulaire.frequence} onChange={modifier} placeholder="Ex. 2 passages par semaine" />
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
          <Plus size={20} /> Ajouter une formule
        </button>
      )}
      {aSupprimer && (
        <FeuilleConfirmation
          titre={`Supprimer la formule « ${aSupprimer.nom} » ?`}
          texte="Les abonnés actuels gardent leur formule. Les nouveaux citoyens ne pourront plus la choisir."
          libelle="Supprimer"
          danger
          onAnnuler={() => setASupprimer(null)}
          onConfirmer={() => supprimer(aSupprimer)}
        />
      )}
    </div>
  );
}
