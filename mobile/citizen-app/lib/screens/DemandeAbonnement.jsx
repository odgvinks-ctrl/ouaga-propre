import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { getStructure } from "../services/structures.js";
import { demanderAbonnement } from "../services/abonnements.js";
import { moyensPaiement } from "../models/statuts.js";
import { prix } from "../services/format.js";
import "./Ecran.css";

export default function DemandeAbonnement() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [structure, setStructure] = useState(null);
  const [form, setForm] = useState({ formuleId: "", quartier: "", repere: "", paiement: "orange_money" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    getStructure(id)
      .then((s) => {
        setStructure(s);
        setForm((actuel) => ({
          ...actuel,
          formuleId: s.formules[0]?.id || "",
          quartier: s.quartiers.includes(user.secteur) ? user.secteur : s.quartiers[0],
        }));
      })
      .catch((e) => setErreur(e.message));
  }, [id, user.secteur]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      await demanderAbonnement(user.id, { structureId: id, ...form });
      navigate("/collecte", { state: { envoye: true } });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  if (!structure) {
    return (
      <section className="ecran">
        {erreur ? <p className="message message-erreur">{erreur}</p> : <p className="message message-vide">Chargement...</p>}
      </section>
    );
  }

  return (
    <section className="ecran">
      <Link to={`/structures/${id}`} className="ecran-retour">
        <ArrowLeft size={18} /> {structure.nom}
      </Link>

      <div>
        <h1>Demander un abonnement</h1>
        <p className="ecran-sous-titre">La structure reçoit votre demande et vous répond directement.</p>
      </div>

      <form className="formulaire" onSubmit={handleSubmit}>
        <div className="champ">
          Formule
          <div className="liste">
            {structure.formules.map((f) => (
              <button
                key={f.id}
                type="button"
                className={form.formuleId === f.id ? "choix-carte actif" : "choix-carte"}
                onClick={() => setForm({ ...form, formuleId: f.id })}
              >
                <div>
                  <strong>
                    {f.nom} · {prix(f.prix)} par mois
                  </strong>
                  <span>{f.frequence}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <label className="champ">
          Quartier de votre domicile
          <select name="quartier" value={form.quartier} onChange={handleChange}>
            {structure.quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>

        <label className="champ">
          Repère pour trouver votre domicile
          <input
            type="text"
            name="repere"
            placeholder="Ex. portail bleu après la boutique"
            value={form.repere}
            onChange={handleChange}
            maxLength={120}
            required
          />
          <span className="champ-aide">
            <Lock size={13} /> Seule la structure voit ce repère et votre numéro.
          </span>
        </label>

        <div className="champ">
          Paiement
          <div className="choix-groupe">
            {Object.entries(moyensPaiement).map(([cle, label]) => (
              <button
                key={cle}
                type="button"
                className={form.paiement === cle ? "choix actif" : "choix"}
                onClick={() => setForm({ ...form, paiement: cle })}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="champ-aide">Vous payez la structure une fois la demande acceptée.</span>
        </div>

        {erreur && <p className="message message-erreur">{erreur}</p>}

        <button type="submit" className="btn btn-primaire btn-large" disabled={chargement}>
          {chargement ? "Envoi..." : "Envoyer ma demande"}
        </button>
      </form>
    </section>
  );
}
