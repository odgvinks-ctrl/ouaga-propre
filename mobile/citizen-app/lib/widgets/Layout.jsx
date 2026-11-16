import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import BarreNavigation from "./BarreNavigation.jsx";
import StatutReseau from "./StatutReseau.jsx";
import Logo from "./Logo.jsx";
import { useAuth } from "../providers/AuthContext.jsx";
import "./Layout.css";

const sansEntete = ["/", "/signaler", "/signaler/envoye", "/gestion", "/gestion/tournee"];
const sansNavigation = ["/signaler", "/signaler/envoye", "/gestion/tournee"];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const entete = !sansEntete.includes(pathname);
  const navigation = !sansNavigation.includes(pathname);

  function quitter() {
    logout();
    navigate("/connexion");
  }

  return (
    <div className="appli">
      {entete && (
        <header className="appli-entete">
          <div className="appli-marque">
            <Logo hauteur={38} />
            <small>{user.role === "structure" ? user.nom : "Espace citoyen"}</small>
          </div>
          <StatutReseau />
          <button type="button" className="appli-quitter" onClick={quitter}>
            <LogOut size={18} />
            Quitter
          </button>
        </header>
      )}
      <main className={entete ? "appli-contenu" : "appli-contenu plein"} data-nav={navigation ? "oui" : "non"}>
        <Outlet />
      </main>
      {navigation && <BarreNavigation />}
    </div>
  );
}
