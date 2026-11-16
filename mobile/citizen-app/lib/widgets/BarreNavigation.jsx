import { useState } from "react";
import { NavLink } from "react-router-dom";
import { House, Truck, Camera, MessageCircle, User, LayoutGrid, Inbox, Navigation } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { useActualisation } from "../providers/useActualisation.js";
import { compterNonLus } from "../services/messages.js";
import "./BarreNavigation.css";

const liensCitoyen = [
  { vers: "/", label: "Accueil", icone: House },
  { vers: "/collecte", label: "Collecte", icone: Truck },
  { vers: "/signaler", label: "Signaler", icone: Camera, central: true, alerte: true },
  { vers: "/messagerie", label: "Messages", icone: MessageCircle, messages: true },
  { vers: "/profil", label: "Profil", icone: User },
];

const liensStructure = [
  { vers: "/gestion", label: "Tableau", icone: LayoutGrid },
  { vers: "/gestion/abonnements", label: "Demandes", icone: Inbox },
  { vers: "/gestion/tournee", label: "Tournée", icone: Navigation, central: true },
  { vers: "/gestion/messagerie", label: "Messages", icone: MessageCircle, messages: true },
  { vers: "/gestion/profil", label: "Profil", icone: User },
];

export default function BarreNavigation() {
  const { user } = useAuth();
  const [nonLus, setNonLus] = useState(0);
  const liens = user?.role === "structure" ? liensStructure : liensCitoyen;

  async function charger() {
    setNonLus(user ? await compterNonLus(user.id) : 0);
  }

  useActualisation(charger, user?.id || "invite", 6000);

  return (
    <nav className="barre-nav" aria-label="Navigation">
      {liens.map(({ vers, label, icone: Icone, central, alerte, messages }) => (
        <NavLink
          key={vers}
          to={vers}
          end={vers === "/" || vers === "/gestion"}
          className={["barre-nav-lien", central && "principal", alerte && "alerte"].filter(Boolean).join(" ")}
        >
          <span className="barre-nav-icone">
            <Icone size={central ? 20 : 22} />
            {messages && nonLus > 0 && <b>{nonLus}</b>}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
