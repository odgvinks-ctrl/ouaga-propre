import { WifiOff } from "lucide-react";
import { useReseau } from "../providers/useReseau.js";

export default function StatutReseau() {
  const enLigne = useReseau();

  if (enLigne) return null;

  return (
    <span className="statut-reseau hors-ligne" role="status">
      <WifiOff size={14} />
      Hors ligne
    </span>
  );
}
