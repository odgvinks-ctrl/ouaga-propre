import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { login } from "../services/auth.js";
import { useAuth } from "../providers/AuthContext.jsx";
import Logo from "../widgets/Logo.jsx";
import ChampMotDePasse from "../widgets/ChampMotDePasse.jsx";
import "./Ecran.css";
import "./Auth.css";

export default function Connexion() {
  const [form, setForm] = useState({ telephone: "", password: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const { enregistrer } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();

  function retour() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/", { replace: true });
  }

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
        navigate(utilisateur.statut === "actif" ? "/gestion" : "/validation");
      } else {
        navigate(state?.depuis || "/");
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
        <button type="button" className="auth-retour" onClick={retour}>
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="auth-logo">
          <Logo hauteur={110} />
        </div>

        <h1>Connexion</h1>
        <p className="auth-sous-titre">Citoyen ou structure de pré-collecte, connectez-vous avec votre numéro de téléphone.</p>

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
          <ChampMotDePasse
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
          Pas encore de compte ?{" "}
          <Link to="/inscription" state={state}>
            Créer un compte
          </Link>
        </p>

        <Link to="/signaler" className="btn btn-secondaire btn-large">
          Signaler un dépotoir sans compte
        </Link>
        <Link to="/" className="auth-bas">
          Continuer sans compte
        </Link>

        <details className="auth-demo">
          <summary>Comptes de démonstration</summary>
          <dl>
            <dt>Citoyen</dt>
            <dd>70000001</dd>
            <dt>Structure validée</dt>
            <dd>70000101</dd>
            <dt>Structure en attente</dt>
            <dd>70000103</dd>
            <dt>Mot de passe</dt>
            <dd>demo12345</dd>
          </dl>
        </details>
      </form>
    </section>
  );
}
