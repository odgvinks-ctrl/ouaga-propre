import { NavLink } from "react-router-dom";
import { LayoutGrid, Map as IconeCarte, Route as IconeTournee, ChartLine, Inbox, Trash2, Sparkles, Users, Truck, User, FileText, Building2 } from "lucide-react";
import "./Sidebar.css";

const groupes = [
  {
    titre: "Pilotage",
    liens: [
      { vers: "/", label: "Tableau de bord", icone: LayoutGrid },
      { vers: "/carte", label: "Carte opérationnelle", icone: IconeCarte },
      { vers: "/plan", label: "Plan de gestion", icone: IconeTournee },
      { vers: "/simulateur", label: "Simulateur Ouaga", icone: ChartLine },
    ],
  },
  {
    titre: "Opérations",
    liens: [
      { vers: "/signalements", label: "Signalements", icone: Inbox },
      { vers: "/collectes", label: "Collectes", icone: Trash2 },
      { vers: "/interventions", label: "Interventions brigade", icone: Sparkles },
      { vers: "/structures", label: "Structures de pré-collecte", icone: Building2 },
      { vers: "/abonnements", label: "Abonnements", icone: Users },
      { vers: "/ressources", label: "Ressources", icone: Truck },
    ],
  },
  {
    titre: "Administration",
    liens: [
      { vers: "/utilisateurs", label: "Utilisateurs", icone: User },
      { vers: "/rapports", label: "Rapports et open data", icone: FileText },
    ],
  },
];

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Menu principal">
      <div className="sidebar-logo">
        <span className="sidebar-marque">OP</span>
        <div>
          <strong>Ouaga Propre</strong>
          <small>Commune de Ouagadougou</small>
        </div>
      </div>
      {groupes.map((groupe) => (
        <div key={groupe.titre} className="sidebar-groupe">
          <p className="sidebar-titre">{groupe.titre}</p>
          {groupe.liens.map(({ vers, label, icone: Icone }) => (
            <NavLink key={vers} to={vers} end={vers === "/"} className="sidebar-lien">
              <Icone size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
