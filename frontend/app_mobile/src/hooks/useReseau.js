import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";

export function useReseau() {
  const [enLigne, setEnLigne] = useState(true);

  useEffect(() => {
    Network.getStatus().then((statut) => setEnLigne(statut.connected));
    const ecouteur = Network.addListener("networkStatusChange", (statut) => setEnLigne(statut.connected));
    return () => {
      ecouteur.then((e) => e.remove());
    };
  }, []);

  return enLigne;
}
