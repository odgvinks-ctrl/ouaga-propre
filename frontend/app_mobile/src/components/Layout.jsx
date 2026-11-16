import { Outlet } from "react-router-dom";
import BarreNavigation from "./BarreNavigation.jsx";
import StatutReseau from "./StatutReseau.jsx";
import "./Layout.css";

export default function Layout() {
  return (
    <div className="appli">
      <header className="appli-entete">
        <strong>Ouaga Propre</strong>
        <StatutReseau />
      </header>
      <main className="appli-contenu">
        <Outlet />
      </main>
      <BarreNavigation />
    </div>
  );
}
