import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../hooks/AuthContext.jsx";
import { useActualisation } from "../hooks/useActualisation.js";
import { lireBase } from "@donnees/base.js";
import Sidebar from "./Sidebar.jsx";
import Logo from "./Logo.jsx";
import "./Layout.css";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [compteurs, setCompteurs] = useState({ signalements: 0, structures: 0, echanges: 0 });

  function charger() {
    const base = lireBase();
    setCompteurs({
      signalements: base.signalements.filter((s) => s.statut === "a_verifier").length,
      structures: base.comptes.filter((c) => c.role === "structure" && c.statut === "en_attente").length,
      echanges: (base.echanges || []).filter((e) => e.statut === "en_attente").length,
    });
  }

  useActualisation(charger, "compteurs");

  function quitter() {
    logout();
    navigate("/connexion");
  }

  return (
    <div className="layout">
      <Sidebar ouvert={ouvert} compteurs={compteurs} onNaviguer={() => setOuvert(false)} onQuitter={quitter} />
      {ouvert && <div className="layout-voile" onClick={() => setOuvert(false)}></div>}
      <div className="layout-principal">
        <header className="barre-haute">
          <button type="button" className="btn btn-secondaire btn-petit" onClick={() => setOuvert(true)}>
            <Menu size={18} /> Menu
          </button>
          <Logo hauteur={36} />
        </header>
        <main className="layout-contenu">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
