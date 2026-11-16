import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthContext.jsx";
import ConnexionRequise from "./ConnexionRequise.jsx";

export default function RouteProtegee({ children, roles, invite = false }) {
  const { user } = useAuth();

  if (!user) {
    if (invite) return children;
    if (roles && !roles.includes("citoyen")) return <Navigate to="/connexion" replace />;
    return <ConnexionRequise />;
  }

  if (user.role === "structure" && user.statut !== "actif") {
    return <Navigate to="/validation" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
