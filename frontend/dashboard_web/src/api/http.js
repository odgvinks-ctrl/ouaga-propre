const racine = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const CLE_JETON = "ouaga-propre-jeton";

export function lireJeton() {
  try {
    return localStorage.getItem(CLE_JETON);
  } catch {
    return null;
  }
}

export function ecrireJeton(jeton) {
  try {
    if (jeton) {
      localStorage.setItem(CLE_JETON, jeton);
    } else {
      localStorage.removeItem(CLE_JETON);
    }
  } catch {
    return;
  }
}

export async function requete(chemin, { methode = "GET", corps, auth = true } = {}) {
  const entetes = {};
  if (corps !== undefined) entetes["Content-Type"] = "application/json";
  const jeton = lireJeton();
  if (auth && jeton) entetes.Authorization = `Bearer ${jeton}`;

  let reponse;
  try {
    reponse = await fetch(racine + chemin, {
      method: methode,
      headers: entetes,
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
    });
  } catch {
    throw new Error("Impossible de joindre le serveur. Vérifie ta connexion.");
  }

  if (reponse.status === 204) return null;

  let donnees = null;
  try {
    donnees = await reponse.json();
  } catch {
    donnees = null;
  }

  if (!reponse.ok) {
    const detail = donnees && typeof donnees.detail === "string" ? donnees.detail : "Une erreur est survenue.";
    throw new Error(detail);
  }
  return donnees;
}
