import { lireBase, delai, comptePublic } from "@donnees/base.js";
import { apiActive, ecrireJeton, lireJeton, requete, requeteFormulaire } from "./http.js";

const CLE_SESSION = "faso-neere-admin-session";

function lireSession() {
  try {
    return localStorage.getItem(CLE_SESSION);
  } catch {
    return null;
  }
}

function ecrireSession(id) {
  try {
    if (id) {
      localStorage.setItem(CLE_SESSION, id);
    } else {
      localStorage.removeItem(CLE_SESSION);
    }
  } catch {
    return;
  }
}

export function sessionActive() {
  return Boolean(apiActive ? lireJeton() : lireSession());
}

export function deconnecter() {
  ecrireSession(null);
  ecrireJeton(null);
}

export async function chargerMoi() {
  if (apiActive) {
    if (!lireJeton()) return null;
    try {
      const compte = await requete("/api/v1/users/me");
      return { ...compte, nom: compte.full_name || compte.email || compte.telephone || "Administrateur" };
    } catch {
      ecrireJeton(null);
      return null;
    }
  }
  await delai();
  const compte = lireBase().comptes.find((c) => c.id === lireSession() && c.role === "admin");
  return compte ? comptePublic(compte) : null;
}

export async function login({ telephone, password }) {
  if (apiActive) {
    const identifiant = String(telephone || "").includes("@")
      ? String(telephone).trim().toLowerCase()
      : String(telephone || "").replace(/\D/g, "").slice(-8);
    const jeton = await requeteFormulaire("/api/v1/login/access-token", {
      username: identifiant,
      password,
    });
    ecrireJeton(jeton.access_token);
    const compte = await requete("/api/v1/users/me");
    if (compte.role !== "ADMIN" || !compte.is_superuser) {
      ecrireJeton(null);
      throw new Error("Ce compte n'a pas accès à l'administration. Utilisez l'application mobile.");
    }
    return { ...compte, role: "admin", nom: compte.full_name || compte.email || compte.telephone };
  }
  await delai();
  const numero = String(telephone || "").replace(/\D/g, "").slice(-8);
  const compte = lireBase().comptes.find((c) => c.telephone === numero);
  if (!compte || compte.password !== password) {
    throw new Error("Numéro ou mot de passe incorrect.");
  }
  if (compte.role !== "admin") {
    throw new Error("Ce compte n'a pas accès à l'administration. Utilisez l'application mobile.");
  }
  ecrireSession(compte.id);
  return comptePublic(compte);
}
