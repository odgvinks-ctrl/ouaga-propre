import { NavLink } from "react-router-dom";
import { House, Camera, Building2, ClipboardList, RefreshCw, Inbox, Truck, Bell, User } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import "./BarreNavigation.css";

const liensCitoyen = [
  { vers: "/", label: "Accueil", icone: House },
  { vers: "/signaler", label: "Signaler", icone: Camera },
  { vers: "/structures", label: "Structures", icone: Building2 },
  { vers: "/demandes", label: "Demandes", icone: ClipboardList },
  { vers: "/envois", label: "Envois", icone: RefreshCw },
];

const liensStructure = [
  { vers: "/gestion", label: "Accueil", icone: House },
  { vers: "/gestion/demandes", label: "Demandes", icone: Inbox },
  { vers: "/gestion/collectes", label: "Collectes", icone: Truck },
  { vers: "/gestion/alertes", label: "Alertes", icone: Bell },
  { vers: "/gestion/profil", label: "Profil", icone: User },
];

export default function BarreNavigation() {
  const { user } = useAuth();
  const liens = user.role === "structure" ? liensStructure : liensCitoyen;

  return (
    <nav className="barre-nav" aria-label="Navigation">
      {liens.map(({ vers, label, icone: Icone }) => (
        <NavLink key={vers} to={vers} end={vers === "/" || vers === "/gestion"} className="barre-nav-lien">
          <Icone size={22} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
