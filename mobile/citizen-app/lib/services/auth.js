import { lireBase, ecrireBase, delai, comptePublic, nouvelId } from "./base.js";

const CLE_SESSION = "ouaga-propre-session";

export function normaliserTelephone(telephone) {
  return String(telephone || "").replace(/\D/g, "").slice(-8);
}

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
  const compte = lireBase().comptes.find((c) => c.id === lireSession());
  return compte ? comptePublic(compte) : null;
}

export async function login({ telephone, password }) {
  await delai();
  const compte = lireBase().comptes.find((c) => c.telephone === normaliserTelephone(telephone));
  if (!compte || compte.password !== password) {
    throw new Error("Numéro ou mot de passe incorrect.");
  }
  if (compte.role === "admin") {
    throw new Error("Les comptes administrateur se connectent sur le tableau de bord web.");
  }
  ecrireSession(compte.id);
  return comptePublic(compte);
}

export async function signup(form) {
  await delai();
  const telephone = normaliserTelephone(form.telephone);
  const structure = form.role === "structure";

  if (form.nom.trim().length < 3) {
    throw new Error(structure ? "Le nom de la structure est trop court." : "Le nom est trop court.");
  }
  if (telephone.length !== 8) {
    throw new Error("Le numéro doit contenir 8 chiffres.");
  }
  if (form.password.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  if (structure && !form.responsable.trim()) {
    throw new Error("Indiquez le nom du responsable.");
  }
  if (structure && !form.numeroEnregistrement.trim()) {
    throw new Error("Le numéro d'enregistrement (RCCM, récépissé ou agrément) est obligatoire.");
  }
  if (structure && !form.piece) {
    throw new Error("Ajoutez une photo ou un scan du document officiel.");
  }

  const base = lireBase();
  if (base.comptes.some((c) => c.telephone === telephone)) {
    throw new Error("Ce numéro est déjà utilisé par un compte.");
  }

  const id = nouvelId(structure ? "str" : "cit");
  const compte = {
    id,
    nom: form.nom.trim(),
    telephone,
    password: form.password,
    role: structure ? "structure" : "citoyen",
    statut: structure ? "en_attente" : "actif",
    secteur: form.secteur,
  };
  base.comptes.push(compte);

  if (structure) {
    base.structures.push({
      id,
      type: form.type,
      responsable: form.responsable.trim(),
      whatsapp: telephone,
      numeroEnregistrement: form.numeroEnregistrement.trim(),
      piece: form.piece,
      description: "",
      quartiers: [form.secteur],
      formules: [],
    });
  }

  ecrireBase(base);
  ecrireSession(id);
  return comptePublic(compte);
}
