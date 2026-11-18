const serveurParDefaut = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const CLE_JETON = "ouaga-propre-jeton";
const CLE_SERVEUR = "faso-neere-serveur";

export function lireServeur() {
  try {
    return localStorage.getItem(CLE_SERVEUR) || "";
  } catch {
    return "";
  }
}

export function ecrireServeur(adresse) {
  let propre = String(adresse || "").trim().replace(/\/+$/, "");
  if (propre && !/^https?:\/\//.test(propre)) propre = "https://" + propre;
  try {
    if (propre) localStorage.setItem(CLE_SERVEUR, propre);
    else localStorage.removeItem(CLE_SERVEUR);
  } catch {
    return propre;
  }
  return propre;
}

export function racineApi() {
  return lireServeur() || serveurParDefaut;
}

export function adressePhoto(adresse) {
  if (!adresse) return "";
  if (/^(data:|https?:)/.test(adresse)) return adresse;
  if (adresse.startsWith("/")) return racineApi() + adresse;
  return "";
}

export const apiActive = Boolean(import.meta.env.VITE_API_URL);

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

export function erreurReseau() {
  const erreur = new Error("Impossible de joindre le serveur. Vérifie ta connexion.");
  erreur.horsLigne = true;
  return erreur;
}

export async function requeteFormulaire(chemin, champs) {
  let reponse;
  try {
    reponse = await fetch(racineApi() + chemin, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(champs),
    });
  } catch {
    throw new Error("Impossible de joindre le serveur. Vérifie ta connexion.");
  }

  const donnees = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const detail = donnees && typeof donnees.detail === "string" ? donnees.detail : "Une erreur est survenue.";
    throw new Error(detail);
  }
  return donnees;
}

export async function requete(chemin, { methode = "GET", corps, auth = true } = {}) {
  const entetes = {};
  if (corps !== undefined) entetes["Content-Type"] = "application/json";
  const jeton = lireJeton();
  if (auth && jeton) entetes.Authorization = `Bearer ${jeton}`;

  let reponse;
  try {
    reponse = await fetch(racineApi() + chemin, {
      method: methode,
      headers: entetes,
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
    });
  } catch {
    throw erreurReseau();
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
