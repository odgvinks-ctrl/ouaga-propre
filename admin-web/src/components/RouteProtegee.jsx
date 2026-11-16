import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext.jsx";

export default function RouteProtegee({ children }) {
  const { user, chargement } = useAuth();

  if (chargement) return <p className="message message-info">Chargement...</p>;
  if (!user) return <Navigate to="/connexion" replace />;
  return children;
}
