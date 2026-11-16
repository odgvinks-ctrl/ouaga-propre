import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/auth.js";
import { useAuth } from "../providers/AuthContext.jsx";
import "./Ecran.css";
import "./Auth.css";

export default function Connexion() {
  const [form, setForm] = useState({ telephone: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const { enregistrer } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      const utilisateur = await login(form);
      enregistrer(utilisateur);
      if (utilisateur.role === "structure") {
        navigate(utilisateur.statut === "actif" ? "/gestion" : "/en-attente");
      } else {
        navigate("/");
      }
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="auth">
      <form className="auth-carte" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <span>OP</span>
          <div>
            <strong>Ouaga Propre</strong>
            <small>Commune de Ouagadougou</small>
          </div>
        </div>

        <h1>Connexion</h1>
        <p className="auth-sous-titre">Citoyen ou structure de pré-collecte, connectez-vous avec votre numéro.</p>

        <label className="champ">
          Numéro de téléphone
          <input
            type="tel"
            name="telephone"
            inputMode="numeric"
            placeholder="70 12 34 56"
            value={form.telephone}
            onChange={handleChange}
            required
          />
        </label>

        <label className="champ">
          Mot de passe
          <input
            type="password"
            name="password"
            placeholder="Votre mot de passe"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        {erreur && <p className="message message-erreur">{erreur}</p>}

        <button type="submit" className="btn btn-primaire btn-large" disabled={chargement}>
          {chargement ? "Connexion..." : "Se connecter"}
        </button>

        <p className="auth-bas">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>

        <p className="auth-demo">
          Comptes de démonstration (mot de passe demo1234) : citoyen 70112233, structure 70223344, structure en attente 78990011.
        </p>
      </form>
    </section>
  );
}
