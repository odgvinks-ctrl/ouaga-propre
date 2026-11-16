import { useEffect, useState } from "react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { getStructure, enregistrerQuartiers } from "@citoyen/services/structures.js";
import { quartiers } from "@citoyen/models/quartiers.js";
import "@citoyen/screens/Ecran.css";

export default function ZonesIntervention() {
  const { user } = useAuth();
  const [choisis, setChoisis] = useState([]);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    getStructure(user.id).then((s) => setChoisis(s.quartiers));
  }, [user.id]);

  function basculer(quartier) {
    setChoisis((actuels) =>
      actuels.includes(quartier) ? actuels.filter((q) => q !== quartier) : [...actuels, quartier]
    );
    setErreur("");
    setSucces("");
  }

  async function enregistrer() {
    setChargement(true);
    try {
      const ordonnes = quartiers.filter((q) => choisis.includes(q));
      await enregistrerQuartiers(user.id, ordonnes);
      setSucces("Quartiers enregistrés. Les citoyens de ces quartiers vous voient maintenant.");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="formulaire">
      <p className="ecran-sous-titre">
        {choisis.length} quartier(s) choisi(s). Vous recevez les alertes et les demandes de ces quartiers.
      </p>

      <div className="grille-secteurs">
        {quartiers.map((q) => (
          <button
            key={q}
            type="button"
            aria-pressed={choisis.includes(q)}
            className={choisis.includes(q) ? "actif" : ""}
            onClick={() => basculer(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {succes && <p className="message message-ok">{succes}</p>}

      <button type="button" className="btn btn-primaire btn-large" onClick={enregistrer} disabled={chargement}>
        {chargement ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}
