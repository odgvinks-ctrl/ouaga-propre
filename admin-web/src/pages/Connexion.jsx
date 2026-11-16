import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { login } from "../services/auth.js";
import { useAuth } from "../hooks/AuthContext.jsx";
import Logo from "../components/Logo.jsx";
import "./Connexion.css";

export default function Connexion() {
  const [form, setForm] = useState({ telephone: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const { user, enregistrer } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

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
      navigate("/");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="connexion">
      <form className="connexion-carte" onSubmit={handleSubmit}>
        <Logo hauteur={110} />
        <div>
          <h1>Administration</h1>
          <p className="page-sous-titre">Espace réservé aux agents de la mairie chargés de la supervision.</p>
        </div>

        <label className="champ">
          Numéro de téléphone
          <input type="tel" name="telephone" inputMode="numeric" value={form.telephone} onChange={handleChange} required />
        </label>
        <label className="champ">
          Mot de passe
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </label>

        {erreur && <p className="message message-erreur">{erreur}</p>}

        <button type="submit" className="btn btn-primaire" disabled={chargement}>
          {chargement ? "Connexion..." : "Se connecter"}
        </button>

        <details className="connexion-demo">
          <summary>Compte de démonstration</summary>
          <dl className="liste-cles">
            <dt>Téléphone</dt>
            <dd>70000000</dd>
            <dt>Mot de passe</dt>
            <dd>admin1234</dd>
          </dl>
        </details>
      </form>
    </section>
  );
}
