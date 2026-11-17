import { useEffect, useRef } from "react";
import { apiActive } from "../services/http.js";

export function useActualisation(charger, cle, ms = 4000) {
  const derniere = useRef(charger);

  useEffect(() => {
    derniere.current = charger;
  });

  useEffect(() => {
    const lancer = () => Promise.resolve(derniere.current()).catch(() => {});
    lancer();
    const minuteur = setInterval(lancer, apiActive ? Math.max(ms, 10000) : ms);
    window.addEventListener("storage", lancer);
    return () => {
      clearInterval(minuteur);
      window.removeEventListener("storage", lancer);
    };
  }, [cle, ms]);
}
