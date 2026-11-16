import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Trash2, Building2, Gift } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { modifierMonProfil } from "../services/auth.js";
import { quartiers } from "../models/quartiers.js";
import "./Ecran.css";

export default function Profil() {
  const { user, enregistrer, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: user.nom, secteur: user.secteur || quartiers[0] });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [chargement, setChargement] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
    setSucces("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      enregistrer(await modifierMonProfil(user.id, form));
      setSucces("Profil enregistré.");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  function quitter() {
    logout();
    navigate("/connexion");
  }

  return (
    <section className="ecran">
      <div>
        <h1>Mon profil</h1>
        <p className="ecran-sous-titre">Numéro : {user.telephone}</p>
      </div>

      <div className="liste">
        <Link to="/recompenses" className="element element-lien">
          <Gift size={20} />
          <strong>Mes points et cadeaux</strong>
          <ChevronRight size={20} />
        </Link>
        <Link to="/mes-signalements" className="element element-lien">
          <MapPin size={20} />
          <strong>Mes signalements</strong>
          <ChevronRight size={20} />
        </Link>
        <Link to="/collecte" className="element element-lien">
          <Trash2 size={20} />
          <strong>Mes collectes et abonnements</strong>
          <ChevronRight size={20} />
        </Link>
        <Link to="/structures" className="element element-lien">
          <Building2 size={20} />
          <strong>Structures disponibles</strong>
          <ChevronRight size={20} />
        </Link>
      </div>

      <form className="formulaire" onSubmit={handleSubmit}>
        <label className="champ">
          Nom complet
          <input type="text" name="nom" value={form.nom} onChange={handleChange} required />
        </label>
        <label className="champ">
          Mon quartier
          <select name="secteur" value={form.secteur} onChange={handleChange}>
            {quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>
        {erreur && <p className="message message-erreur">{erreur}</p>}
        {succes && <p className="message message-ok">{succes}</p>}
        <button type="submit" className="btn btn-primaire btn-large" disabled={chargement}>
          {chargement ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>

      <button type="button" className="btn btn-refuser btn-large" onClick={quitter}>
        Se déconnecter
      </button>
    </section>
  );
}
