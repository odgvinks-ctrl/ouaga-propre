import { requete } from "./http.js";

export function listerModes() {
  return requete("/simulation/modes");
}
