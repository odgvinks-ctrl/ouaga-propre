import { Wifi, WifiOff } from "lucide-react";
import { useReseau } from "../hooks/useReseau.js";

export default function StatutReseau() {
  const enLigne = useReseau();

  return (
    <span className={enLigne ? "statut-reseau en-ligne" : "statut-reseau hors-ligne"}>
      {enLigne ? <Wifi size={14} /> : <WifiOff size={14} />}
      {enLigne ? "En ligne" : "Hors ligne"}
    </span>
  );
}
