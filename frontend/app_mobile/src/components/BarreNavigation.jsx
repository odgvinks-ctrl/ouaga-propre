import { NavLink } from "react-router-dom";
import { House, Camera, Trash2, RefreshCw } from "lucide-react";
import "./BarreNavigation.css";

const liens = [
  { vers: "/", label: "Accueil", icone: House },
  { vers: "/signaler", label: "Signaler", icone: Camera },
  { vers: "/collecte", label: "Collecte", icone: Trash2 },
  { vers: "/envois", label: "Mes envois", icone: RefreshCw },
];

export default function BarreNavigation() {
  return (
    <nav className="barre-nav" aria-label="Navigation">
      {liens.map(({ vers, label, icone: Icone }) => (
        <NavLink key={vers} to={vers} end={vers === "/"} className="barre-nav-lien">
          <Icone size={22} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
