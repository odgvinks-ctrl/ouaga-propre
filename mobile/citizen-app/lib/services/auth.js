import { lireBase, ecrireBase, delai, comptePublic, nouvelId } from "./base.js";
import { piecesRequises } from "../models/documents.js";
import { idAppareil } from "./invite.js";

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
  return compte && compte.statut !== "suspendu" ? comptePublic(compte) : null;
}

function rattacherSignalementsInvite(base, citoyenId) {
  const invite = idAppareil();
  let nombre = 0;
  base.signalements.forEach((s) => {
    if (s.auteurId === invite) {
      s.auteurId = citoyenId;
      nombre += 1;
    }
    if ((s.confirmations || []).includes(invite)) {
      s.confirmations = s.confirmations.map((c) => (c === invite ? citoyenId : c));
      nombre += 1;
    }
  });
  return nombre;
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
  if (compte.statut === "suspendu") {
    throw new Error("Ce compte est suspendu. Contactez la mairie pour le réactiver.");
  }
  if (compte.role === "citoyen") {
    const base = lireBase();
    if (rattacherSignalementsInvite(base, compte.id)) ecrireBase(base);
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
  if (structure && form.numeroCnib.trim().length < 6) {
    throw new Error("Indiquez le numéro de la CNIB ou du passeport du responsable.");
  }
  if (structure && !form.numeroEnregistrement.trim()) {
    throw new Error("Le numéro d'enregistrement de la structure est obligatoire.");
  }
  if (structure && form.type === "Entreprise" && !form.ifu.trim()) {
    throw new Error("Le numéro IFU est obligatoire pour une entreprise.");
  }
  if (structure) {
    const manquante = piecesRequises(form.type).find((p) => p.obligatoire && !form.pieces[p.cle]);
    if (manquante) throw new Error(`Ajoutez le document : ${manquante.label.toLowerCase()}.`);
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
      numeroCnib: form.numeroCnib.trim().toUpperCase(),
      ifu: form.ifu.trim().toUpperCase(),
      piece: form.pieces.legal,
      pieces: form.pieces,
      description: "",
      quartiers: [form.secteur],
      formules: [],
    });
  }

  if (!structure) rattacherSignalementsInvite(base, id);
  ecrireBase(base);
  ecrireSession(id);
  return comptePublic(compte);
}

export async function modifierMonProfil(id, { nom, secteur }) {
  await delai();
  if (nom.trim().length < 3) throw new Error("Le nom est trop court.");
  const base = lireBase();
  const compte = base.comptes.find((c) => c.id === id);
  if (!compte) throw new Error("Compte introuvable.");
  compte.nom = nom.trim();
  compte.secteur = secteur;
  ecrireBase(base);
  return comptePublic(compte);
}
