import { requete } from "./http.js";

export function listerCamions() {
  return requete("/flotte/camions");
}
