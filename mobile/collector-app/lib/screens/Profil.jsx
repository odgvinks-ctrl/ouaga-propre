import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { getStructure, modifierProfil } from "@citoyen/services/structures.js";
import { typesStructure } from "@citoyen/models/statuts.js";
import ZonesIntervention from "../widgets/ZonesIntervention.jsx";
import GrilleTarifs from "../widgets/GrilleTarifs.jsx";
import "@citoyen/screens/Ecran.css";

const onglets = [
  { cle: "infos", label: "Informations" },
  { cle: "secteurs", label: "Quartiers" },
  { cle: "tarifs", label: "Tarifs" },
];

export default function Profil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const onglet = params.get("onglet") || "infos";
  const [structure, setStructure] = useState(null);
  const [form, setForm] = useState({ type: "", responsable: "", whatsapp: "", description: "" });
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    getStructure(user.id).then((s) => {
      setStructure(s);
      setForm({ type: s.type, responsable: s.responsable, whatsapp: s.whatsapp, description: s.description });
    });
  }, [user.id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
    setSucces("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      setStructure(await modifierProfil(user.id, form));
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

  if (!structure) {
    return (
      <section className="ecran">
        <p className="message message-vide">Chargement...</p>
      </section>
    );
  }

  return (
    <section className="ecran">
      <h1>Profil de la structure</h1>

      <div className="choix-groupe" role="tablist">
        {onglets.map((o) => (
          <button
            key={o.cle}
            type="button"
            role="tab"
            aria-selected={onglet === o.cle}
            className={onglet === o.cle ? "choix actif" : "choix"}
            onClick={() => setParams({ onglet: o.cle })}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "secteurs" && <ZonesIntervention />}
      {onglet === "tarifs" && <GrilleTarifs />}

      {onglet === "infos" && (
        <>

      <div className="element">
        <h3>{structure.nom}</h3>
        <p className="element-meta">
          Téléphone : {structure.telephone}
          <br />
          N° d'enregistrement : {structure.numeroEnregistrement}
        </p>
        <p className="champ-aide">
          <Lock size={13} /> Ces informations ont été vérifiées. Pour les changer, contactez l'administration.
        </p>
      </div>

      <form className="formulaire" onSubmit={handleSubmit}>
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
          Responsable
          <input type="text" name="responsable" value={form.responsable} onChange={handleChange} required />
        </label>

        <label className="champ">
          Numéro WhatsApp
          <input type="tel" name="whatsapp" inputMode="numeric" value={form.whatsapp} onChange={handleChange} />
        </label>

        <label className="champ">
          Présentation
          <textarea
            name="description"
            placeholder="Ce que vous faites, vos jours de passage, votre matériel..."
            value={form.description}
            onChange={handleChange}
            maxLength={300}
          />
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
        </>
      )}
    </section>
  );
}
