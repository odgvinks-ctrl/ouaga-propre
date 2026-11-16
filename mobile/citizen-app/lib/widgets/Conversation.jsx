import { useEffect, useRef, useState } from "react";
import { Phone, Send } from "lucide-react";
import { useActualisation } from "../providers/useActualisation.js";
import { getConversation, envoyerMessage } from "../services/messages.js";
import { dateHeure } from "../services/format.js";
import "./Conversation.css";

export default function Conversation({ id, moi }) {
  const [conversation, setConversation] = useState(null);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const bas = useRef(null);

  async function charger() {
    try {
      setConversation(await getConversation(id, moi));
    } catch (err) {
      setErreur(err.message);
    }
  }

  useActualisation(charger, id, 3000);

  const nombre = conversation ? conversation.messages.length : 0;

  useEffect(() => {
    if (bas.current) bas.current.scrollIntoView({ block: "end" });
  }, [nombre]);

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await envoyerMessage(id, moi, texte);
      setTexte("");
      setErreur("");
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="ecran conversation">
      <div className="conversation-entete">
        <h1>{conversation ? conversation.autreNom : "Messages"}</h1>
        {conversation?.autreTelephone && (
          <a href={`tel:${conversation.autreTelephone}`} className="btn btn-secondaire">
            <Phone size={18} /> Appeler
          </a>
        )}
      </div>

      {erreur && <p className="message message-erreur">{erreur}</p>}
      {conversation && conversation.messages.length === 0 && (
        <p className="message message-vide">Écrivez votre premier message.</p>
      )}

      <div className="conversation-fil">
        {conversation?.messages.map((m) => (
          <div key={m.id} className={m.auteurId === moi ? "bulle bulle-moi" : "bulle"}>
            <p>{m.texte}</p>
            <span>{dateHeure(m.date)}</span>
          </div>
        ))}
        <div ref={bas}></div>
      </div>

      <form className="conversation-saisie" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Votre message"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={1000}
          aria-label="Votre message"
        />
        <button type="submit" className="btn btn-primaire" disabled={envoi || !texte.trim()}>
          <Send size={18} /> Envoyer
        </button>
      </form>
    </section>
  );
}
