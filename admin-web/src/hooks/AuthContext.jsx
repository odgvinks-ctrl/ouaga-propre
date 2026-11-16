import { createContext, useContext, useEffect, useState } from "react";
import { chargerMoi, deconnecter, sessionActive } from "../services/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [chargement, setChargement] = useState(sessionActive());

  useEffect(() => {
    if (!sessionActive()) return;
    chargerMoi()
      .then((compte) => {
        setUser(compte);
        if (!compte) deconnecter();
      })
      .finally(() => setChargement(false));
  }, []);

  function enregistrer(utilisateur) {
    setUser(utilisateur);
  }

  function logout() {
    deconnecter();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, chargement, enregistrer, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
