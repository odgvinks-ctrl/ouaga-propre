import { useEffect, useState } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { useReseau } from "../providers/useReseau.js";
import { apiActive } from "../services/http.js";
import { ecouterEnvois, listerEnvois, synchroniser } from "../services/sync.js";

export default function StatutReseau() {
  const enLigne = useReseau();
  const [attente, setAttente] = useState(0);

  useEffect(() => {
    if (!apiActive) return;
    const compter = () => listerEnvois().then((liste) => setAttente(liste.length)).catch(() => {});
    compter();
    return ecouterEnvois(compter);
  }, []);

  useEffect(() => {
    if (!apiActive || !enLigne) return;
    synchroniser().catch(() => {});
    const minuteur = setInterval(() => synchroniser().catch(() => {}), 30000);
    return () => clearInterval(minuteur);
  }, [enLigne]);

  if (enLigne && attente === 0) return null;

  if (enLigne) {
    return (
      <span className="statut-reseau" role="status">
        <CloudUpload size={14} />
        Envoi de {attente} signalement(s)...
      </span>
    );
  }

  return (
    <span className="statut-reseau hors-ligne" role="status">
      <WifiOff size={14} />
      Hors ligne{attente > 0 ? ` · ${attente} en attente` : ""}
    </span>
  );
}
