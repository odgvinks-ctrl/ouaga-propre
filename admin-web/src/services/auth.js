import { lireBase, delai, comptePublic } from "@donnees/base.js";

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
  return Boolean(lireSession());
}

export function deconnecter() {
  ecrireSession(null);
}

export async function chargerMoi() {
  await delai();
  const compte = lireBase().comptes.find((c) => c.id === lireSession() && c.role === "admin");
  return compte ? comptePublic(compte) : null;
}

export async function login({ telephone, password }) {
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
