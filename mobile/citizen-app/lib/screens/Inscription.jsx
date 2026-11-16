import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Upload } from "lucide-react";
import { signup } from "../services/auth.js";
import { useAuth } from "../providers/AuthContext.jsx";
import { quartiers } from "../models/quartiers.js";
import { typesStructure } from "../models/statuts.js";
import "./Ecran.css";
import "./Auth.css";

const vide = {
  role: "citoyen",
  nom: "",
  telephone: "",
  secteur: quartiers[14],
  password: "",
  type: typesStructure[0],
  responsable: "",
  numeroEnregistrement: "",
  piece: "",
};

export default function Inscription() {
  const [form, setForm] = useState(vide);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const { enregistrer } = useAuth();
  const navigate = useNavigate();
  const structure = form.role === "structure";

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
  }

  function choisirRole(role) {
    setForm({ ...form, role });
    setErreur("");
  }

  function choisirPiece(e) {
    const fichier = e.target.files[0];
    setForm({ ...form, piece: fichier ? fichier.name : "" });
    setErreur("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      const utilisateur = await signup(form);
      enregistrer(utilisateur);
      navigate(utilisateur.role === "structure" ? "/en-attente" : "/");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="auth">
      <form className="auth-carte" onSubmit={handleSubmit}>
        <h1>Créer un compte</h1>
        <p className="auth-sous-titre">Vous êtes :</p>

        <div className="liste">
          <button
            type="button"
            className={form.role === "citoyen" ? "choix-carte actif" : "choix-carte"}
            onClick={() => choisirRole("citoyen")}
          >
            <div>
              <strong>Un citoyen ou un ménage</strong>
              <span>Signaler des dépotoirs, s'abonner à une structure de collecte</span>
            </div>
          </button>
          <button
            type="button"
            className={structure ? "choix-carte actif" : "choix-carte"}
            onClick={() => choisirRole("structure")}
          >
            <div>
              <strong>Une structure de pré-collecte</strong>
              <span>GIE, entreprise ou association qui collecte les ordures</span>
            </div>
          </button>
        </div>

        <label className="champ">
          {structure ? "Nom de la structure" : "Nom complet"}
          <input
            type="text"
            name="nom"
            placeholder={structure ? "Ex. GIE Ramassage Plus" : "Prénom Nom"}
            value={form.nom}
            onChange={handleChange}
            required
          />
        </label>

        {structure && (
          <>
            <label className="champ">
              Type de structure
              <select name="type" value={form.type} onChange={handleChange}>
                {typesStructure.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="champ">
              Nom du responsable
              <input type="text" name="responsable" value={form.responsable} onChange={handleChange} required />
            </label>
          </>
        )}

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
          {structure ? "Secteur principal d'intervention" : "Votre secteur"}
          <select name="secteur" value={form.secteur} onChange={handleChange}>
            {quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          {structure && <span className="champ-aide">Vous pourrez ajouter d'autres secteurs après la validation.</span>}
        </label>

        {structure && (
          <>
            <label className="champ">
              Numéro d'enregistrement
              <input
                type="text"
                name="numeroEnregistrement"
                placeholder="RCCM, récépissé ou agrément"
                value={form.numeroEnregistrement}
                onChange={handleChange}
                required
              />
            </label>

            <label className="champ">
              Document officiel
              <span className="choix-carte">
                <Upload size={20} />
                <span>{form.piece || "Photo ou scan du RCCM, du récépissé ou de l'agrément"}</span>
              </span>
              <input type="file" accept="image/*,application/pdf" onChange={choisirPiece} hidden />
            </label>

            <p className="message message-info">
              <ShieldCheck size={18} /> Votre compte sera vérifié par l'administration avant d'être activé. Cela évite qu'une
              autre personne se fasse passer pour votre structure.
            </p>
          </>
        )}

        <label className="champ">
          Mot de passe
          <input
            type="password"
            name="password"
            placeholder="Au moins 8 caractères"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        {erreur && <p className="message message-erreur">{erreur}</p>}

        <button type="submit" className="btn btn-primaire btn-large" disabled={chargement}>
          {chargement ? "Création du compte..." : structure ? "Envoyer ma demande" : "Créer mon compte"}
        </button>

        <p className="auth-bas">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </section>
  );
}
