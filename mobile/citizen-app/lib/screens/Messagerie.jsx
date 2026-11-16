import { useParams } from "react-router-dom";
import { useAuth } from "../providers/AuthContext.jsx";
import Conversation from "../widgets/Conversation.jsx";
import ListeConversations from "../widgets/ListeConversations.jsx";
import "./Ecran.css";

export default function Messagerie() {
  const { id } = useParams();
  const { user } = useAuth();

  if (id) return <Conversation id={id} moi={user.id} retour="/messagerie" />;

  return (
    <section className="ecran">
      <div>
        <h1>Messagerie</h1>
        <p className="ecran-sous-titre">Vos échanges avec les structures de pré-collecte.</p>
      </div>
      <ListeConversations
        moi={user.id}
        base="/messagerie"
        vide="Aucune conversation. Ouvrez la fiche d'une structure pour lui écrire."
      />
    </section>
  );
}
