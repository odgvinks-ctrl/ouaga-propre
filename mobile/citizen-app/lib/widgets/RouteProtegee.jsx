import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthContext.jsx";

export default function RouteProtegee({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  if (user.role === "structure" && user.statut !== "actif") {
    return <Navigate to="/en-attente" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
