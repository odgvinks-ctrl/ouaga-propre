import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { getStructures, prixMinimum } from "../services/structures.js";
import { quartiers } from "../models/quartiers.js";
import { prix } from "../services/format.js";
import "./Ecran.css";

export default function Structures() {
  const { user } = useAuth();
  const [quartier, setQuartier] = useState(user.secteur || "");
  const [structures, setStructures] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    setChargement(true);
    getStructures(quartier)
      .then((liste) => {
        setStructures(liste);
        setErreur("");
      })
      .catch((e) => setErreur(e.message))
      .finally(() => setChargement(false));
  }, [quartier]);

  return (
    <section className="ecran">
      <div>
        <h1>Structures de pré-collecte</h1>
        <p className="ecran-sous-titre">GIE, entreprises et associations qui ramassent les ordures dans votre secteur.</p>
      </div>

      <label className="champ">
        Secteur
        <select value={quartier} onChange={(e) => setQuartier(e.target.value)}>
          <option value="">Tous les secteurs</option>
          {quartiers.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {chargement && <p className="message message-vide">Chargement...</p>}
      {!chargement && structures.length === 0 && !erreur && (
        <p className="message message-vide">Aucune structure ne couvre encore ce secteur.</p>
      )}

      <div className="liste">
        {structures.map((s) => {
          const minimum = prixMinimum(s);
          return (
            <Link key={s.id} to={`/structures/${s.id}`} className="element">
              <div className="element-haut">
                <div>
                  <h3>{s.nom}</h3>
                  <p className="element-meta">{s.type}</p>
                </div>
                <ChevronRight size={20} />
              </div>
              <div className="etiquettes">
                {s.quartiers.slice(0, 3).map((q) => (
                  <span key={q} className="etiquette">
                    {q}
                  </span>
                ))}
                {s.quartiers.length > 3 && <span className="etiquette">+{s.quartiers.length - 3}</span>}
              </div>
              {minimum !== null && <p className="element-meta">À partir de {prix(minimum)} par mois</p>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
