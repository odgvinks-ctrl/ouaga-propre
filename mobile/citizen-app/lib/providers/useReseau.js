import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";

export function useReseau() {
  const [enLigne, setEnLigne] = useState(() => navigator.onLine !== false);

  useEffect(() => {
    const suivreNavigateur = () => setEnLigne(navigator.onLine !== false);
    window.addEventListener("online", suivreNavigateur);
    window.addEventListener("offline", suivreNavigateur);
    Network.getStatus()
      .then((statut) => setEnLigne(statut.connected))
      .catch(() => {});
    const ecouteur = Network.addListener("networkStatusChange", (statut) => setEnLigne(statut.connected)).catch(() => null);
    return () => {
      window.removeEventListener("online", suivreNavigateur);
      window.removeEventListener("offline", suivreNavigateur);
      ecouteur.then((e) => e && e.remove());
    };
  }, []);

  return enLigne;
}
