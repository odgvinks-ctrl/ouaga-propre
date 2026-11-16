import { useState } from "react";
import { Link } from "react-router-dom";
import { useActualisation } from "../providers/useActualisation.js";
import { getConversations } from "../services/messages.js";
import { dateCourte } from "../services/format.js";

export default function ListeConversations({ moi, base, vide }) {
  const [conversations, setConversations] = useState([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    setConversations(await getConversations(moi));
    setChargement(false);
  }

  useActualisation(charger, moi);

  if (chargement) return <p className="message message-vide">Chargement...</p>;
  if (conversations.length === 0) return <p className="message message-vide">{vide}</p>;

  return (
    <div className="liste">
      {conversations.map((c) => (
        <Link key={c.id} to={`${base}/${c.id}`} className="element">
          <div className="element-haut">
            <h3>{c.autreNom}</h3>
            {c.nonLus > 0 ? (
              <span className="badge statut-info">{c.nonLus} nouveau{c.nonLus > 1 ? "x" : ""}</span>
            ) : (
              <span className="element-meta">{c.dernier ? dateCourte(c.dernier.date) : ""}</span>
            )}
          </div>
          <p className="element-meta">{c.dernier ? c.dernier.texte : "Aucun message"}</p>
        </Link>
      ))}
    </div>
  );
}
