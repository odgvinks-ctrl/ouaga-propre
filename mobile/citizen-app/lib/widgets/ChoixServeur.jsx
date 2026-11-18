import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ecrireJeton, ecrireServeur, lireServeur, racineApi } from "../services/http.js";

export default function ChoixServeur() {
  const [adresse, setAdresse] = useState(lireServeur());
  const [actuel, setActuel] = useState(racineApi());
  const [etat, setEtat] = useState("");

  if (!Capacitor.isNativePlatform()) return null;

  async function tester(racine) {
    setEtat("Test en cours...");
    try {
      const reponse = await fetch(racine + "/api/v1/utils/health-check/");
      setEtat(reponse.ok ? "Serveur joignable." : "Le serveur répond mais avec une erreur.");
    } catch {
      setEtat("Serveur injoignable. Vérifie l'adresse.");
    }
  }

  function enregistrer() {
    const propre = ecrireServeur(adresse);
    ecrireJeton(null);
    setAdresse(propre);
    setActuel(racineApi());
    tester(racineApi());
  }

  return (
    <details className="auth-demo">
      <summary>Adresse du serveur</summary>
      <p className="auth-serveur-actuel">Actuelle : {actuel || "même adresse que l'application"}</p>
      <div className="auth-serveur-champ">
        <input
          type="url"
          inputMode="url"
          value={adresse}
          placeholder="https://xxxx.trycloudflare.com"
          onChange={(e) => setAdresse(e.target.value)}
        />
        <button type="button" className="btn btn-secondaire" onClick={enregistrer}>
          Enregistrer
        </button>
      </div>
      {etat && <p className="auth-serveur-etat">{etat}</p>}
    </details>
  );
}
