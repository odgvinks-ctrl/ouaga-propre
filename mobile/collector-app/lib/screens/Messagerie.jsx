import { useParams } from "react-router-dom";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import Conversation from "@citoyen/widgets/Conversation.jsx";
import ListeConversations from "@citoyen/widgets/ListeConversations.jsx";
import "@citoyen/screens/Ecran.css";

export default function Messagerie() {
  const { id } = useParams();
  const { user } = useAuth();

  if (id) return <Conversation id={id} moi={user.id} retour="/gestion/messagerie" />;

  return (
    <section className="ecran">
      <div>
        <h1>Messagerie</h1>
        <p className="ecran-sous-titre">Les questions de vos abonnés et des citoyens de vos quartiers.</p>
      </div>
      <ListeConversations moi={user.id} base="/gestion/messagerie" vide="Aucun message pour le moment." />
    </section>
  );
}
