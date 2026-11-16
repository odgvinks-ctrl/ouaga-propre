import { Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import BarreNavigation from "./BarreNavigation.jsx";
import StatutReseau from "./StatutReseau.jsx";
import { useAuth } from "../providers/AuthContext.jsx";
import "./Layout.css";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function quitter() {
    logout();
    navigate("/connexion");
  }

  return (
    <div className="appli">
      <header className="appli-entete">
        <div className="appli-marque">
          <span>OP</span>
          <div>
            <strong>Ouaga Propre</strong>
            <small>{user.role === "structure" ? user.nom : "Commune de Ouagadougou"}</small>
          </div>
        </div>
        <StatutReseau />
        <button type="button" className="appli-quitter" onClick={quitter} aria-label="Se déconnecter">
          <LogOut size={20} />
        </button>
      </header>
      <main className="appli-contenu">
        <Outlet />
      </main>
      <BarreNavigation />
    </div>
  );
}
