import { useEffect, useRef } from "react";

export function useActualisation(charger, cle, ms = 4000) {
  const derniere = useRef(charger);

  useEffect(() => {
    derniere.current = charger;
  });

  useEffect(() => {
    const lancer = () => Promise.resolve(derniere.current()).catch(() => {});
    lancer();
    const minuteur = setInterval(lancer, ms);
    window.addEventListener("storage", lancer);
    return () => {
      clearInterval(minuteur);
      window.removeEventListener("storage", lancer);
    };
  }, [cle, ms]);
}
