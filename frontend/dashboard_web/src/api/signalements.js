import { requete } from "./http.js";

export function listerSignalements(statut) {
  const filtre = statut ? `?statut=${encodeURIComponent(statut)}` : "";
  return requete(`/signalements/${filtre}`);
}
