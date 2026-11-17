import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Map as IconeCarte,
  MapPin,
  Camera,
  ShieldCheck,
  Building2,
  Users,
  SlidersHorizontal,
  GitCompare,
  FileDown,
  Gift,
  Smartphone,
  Route,
  Shovel,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/AuthContext.jsx";
import Logo from "./Logo.jsx";
import "./Sidebar.css";

const groupes = [
  {
    titre: "Pilotage",
    liens: [
      { vers: "/", label: "Tableau de bord", icone: LayoutGrid },
      { vers: "/carte", label: "Carte globale", icone: IconeCarte },
      { vers: "/points", label: "Points de regroupement", icone: MapPin },
    ],
  },
  {
    titre: "Gestion",
    liens: [
      { vers: "/signalements", label: "Signalements", icone: Camera, compteur: "signalements" },
      { vers: "/ussd", label: "Canal USSD et SMS", icone: Smartphone },
      { vers: "/validation", label: "Validation des structures", icone: ShieldCheck, compteur: "structures" },
      { vers: "/structures", label: "Structures", icone: Building2 },
      { vers: "/brigade", label: "Brigade Laabal", icone: Shovel },
      { vers: "/utilisateurs", label: "Utilisateurs", icone: Users },
      { vers: "/recompenses", label: "Récompenses", icone: Gift, compteur: "echanges" },
    ],
  },
  {
    titre: "Aide à la décision",
    liens: [
      { vers: "/plan", label: "Plan de gestion", icone: Route },
      { vers: "/simulation", label: "Paramètres de simulation", icone: SlidersHorizontal },
      { vers: "/scenarios", label: "Comparaison de scénarios", icone: GitCompare },
      { vers: "/rapports", label: "Rapports et exports", icone: FileDown },
    ],
  },
];

export default function Sidebar({ ouvert, compteurs, onNaviguer, onQuitter }) {
  const { user } = useAuth();

  return (
    <nav className={ouvert ? "sidebar ouvert" : "sidebar"} aria-label="Menu principal">
      <div className="sidebar-logo">
        <Logo hauteur={56} />
        <small>Administration</small>
      </div>
      <div className="sidebar-groupes">
        {groupes.map((groupe) => (
          <div key={groupe.titre} className="sidebar-groupe">
            <p className="sidebar-titre">{groupe.titre}</p>
            {groupe.liens.map(({ vers, label, icone: Icone, compteur }) => (
              <NavLink key={vers} to={vers} end={vers === "/"} className="sidebar-lien" onClick={onNaviguer}>
                <Icone size={19} />
                <span>{label}</span>
                {compteur && compteurs[compteur] > 0 && <b className="compteur a-traiter">{compteurs[compteur]}</b>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="sidebar-compte">
        <div>
          <strong>{user?.nom}</strong>
          <small>Administrateur</small>
        </div>
        <button type="button" className="btn btn-secondaire btn-petit" onClick={onQuitter}>
          <LogOut size={16} /> Quitter
        </button>
      </div>
    </nav>
  );
}
