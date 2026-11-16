import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Upload, Check } from "lucide-react";
import { signup } from "../services/auth.js";
import { useAuth } from "../providers/AuthContext.jsx";
import { quartiers } from "../models/quartiers.js";
import { typesStructure } from "../models/statuts.js";
import { libellesEnregistrement, piecesRequises } from "../models/documents.js";
import "./Ecran.css";
import "./Auth.css";
import Logo from "../widgets/Logo.jsx";

const vide = {
  role: "citoyen",
  nom: "",
  telephone: "",
  secteur: quartiers[0],
  password: "",
  type: typesStructure[0],
  responsable: "",
  numeroCnib: "",
  numeroEnregistrement: "",
  ifu: "",
  pieces: { identite: "", legal: "", ifu: "", agrement: "" },
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

  function choisirPiece(cle, e) {
    const fichier = e.target.files[0];
    setForm({ ...form, pieces: { ...form.pieces, [cle]: fichier ? fichier.name : "" } });
    setErreur("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      const utilisateur = await signup(form);
      enregistrer(utilisateur);
      navigate(utilisateur.role === "structure" ? "/validation" : "/");
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
          <Logo hauteur={64} />
        </div>
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

            <label className="champ">
              N° de CNIB ou de passeport du responsable
              <input type="text" name="numeroCnib" placeholder="Ex. B10458231" value={form.numeroCnib} onChange={handleChange} required />
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
          {structure ? "Quartier principal d'intervention" : "Votre quartier"}
          <select name="secteur" value={form.secteur} onChange={handleChange}>
            {quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          {structure && <span className="champ-aide">Vous pourrez ajouter d'autres quartiers après la validation.</span>}
        </label>

        {structure && (
          <>
            <p className="section-titre">Enregistrement de la structure</p>
            <label className="champ">
              {libellesEnregistrement[form.type]}
              <input type="text" name="numeroEnregistrement" value={form.numeroEnregistrement} onChange={handleChange} required />
            </label>

            <label className="champ">
              Numéro IFU {form.type === "Entreprise" ? "" : "(facultatif)"}
              <input type="text" name="ifu" placeholder="Identifiant financier unique" value={form.ifu} onChange={handleChange} />
            </label>

            <p className="section-titre">Documents à joindre</p>
            <p className="champ-aide">Photos nettes ou scans. L'administration les compare aux numéros ci-dessus.</p>
            {piecesRequises(form.type).map((piece) => (
              <label key={piece.cle} className="champ inscription-piece">
                <span className={form.pieces[piece.cle] ? "choix-carte actif" : "choix-carte"}>
                  {form.pieces[piece.cle] ? <Check size={20} /> : <Upload size={20} />}
                  <span>
                    <strong>
                      {piece.label}
                      {!piece.obligatoire && " (facultatif)"}
                    </strong>
                    <span>{form.pieces[piece.cle] || piece.aide}</span>
                  </span>
                </span>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => choisirPiece(piece.cle, e)} hidden />
              </label>
            ))}

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
