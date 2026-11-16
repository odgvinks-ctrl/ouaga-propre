import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { getStructure, enregistrerQuartiers } from "@citoyen/services/structures.js";
import { quartiers } from "@citoyen/models/quartiers.js";
import "@citoyen/screens/Ecran.css";

export default function Zones() {
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
      setSucces("Secteurs enregistrés. Les citoyens de ces secteurs vous voient maintenant.");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <section className="ecran">
      <Link to="/gestion" className="ecran-retour">
        <ArrowLeft size={18} /> Accueil
      </Link>
      <div>
        <h1>Secteurs d'intervention</h1>
        <p className="ecran-sous-titre">
          {choisis.length} secteur(s) choisi(s). Vous recevez les alertes et les demandes de ces secteurs.
        </p>
      </div>

      <div className="choix-groupe">
        {quartiers.map((q) => (
          <button
            key={q}
            type="button"
            className={choisis.includes(q) ? "choix actif" : "choix"}
            style={{ flex: "0 0 calc(33.33% - 6px)" }}
            onClick={() => basculer(q)}
          >
            {q.replace("Secteur ", "S. ")}
          </button>
        ))}
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {succes && <p className="message message-ok">{succes}</p>}

      <button type="button" className="btn btn-primaire btn-large" onClick={enregistrer} disabled={chargement}>
        {chargement ? "Enregistrement..." : "Enregistrer"}
      </button>
    </section>
  );
}
