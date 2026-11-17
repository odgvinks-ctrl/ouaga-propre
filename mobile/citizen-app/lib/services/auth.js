import { lireBase, ecrireBase, delai, comptePublic, nouvelId } from "./base.js";
import { piecesRequises } from "../models/documents.js";
import { COMMISSION, VERSION_CONDITIONS } from "../models/conditions.js";
import { idAppareil } from "./invite.js";
import { apiActive, ecrireJeton, lireJeton, requete, requeteFormulaire } from "./http.js";
import { lireReferencesSuivi } from "./signalements.js";

const CLE_QUARTIERS = "faso-neere-quartiers";
const CLE_ATTENTE = "faso-neere-structure-en-attente";

function lireAttente() {
  try {
    return JSON.parse(localStorage.getItem(CLE_ATTENTE) || "null");
  } catch {
    return null;
  }
}

function ecrireAttente(compte) {
  try {
    if (compte) localStorage.setItem(CLE_ATTENTE, JSON.stringify(compte));
    else localStorage.removeItem(CLE_ATTENTE);
  } catch {
    return;
  }
}

function lireQuartiers() {
  try {
    return JSON.parse(localStorage.getItem(CLE_QUARTIERS) || "{}");
  } catch {
    return {};
  }
}

function ecrireQuartier(id, quartier) {
  try {
    localStorage.setItem(CLE_QUARTIERS, JSON.stringify({ ...lireQuartiers(), [id]: quartier }));
  } catch {
    return;
  }
}

async function rattacherSignalementsApi() {
  const references = Object.values(lireReferencesSuivi());
  if (!references.length) return;
  await requete("/api/v1/signalements/rattacher", { methode: "POST", corps: { references } }).catch(() => null);
}

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
  return Boolean(apiActive ? lireJeton() || lireAttente() : lireSession());
}

export function deconnecter() {
  ecrireAttente(null);
  ecrireSession(null);
  ecrireJeton(null);
}

export async function chargerMoi() {
  if (apiActive) {
    if (!lireJeton()) return lireAttente();
    try {
      return convertirCompte(await requete("/api/v1/users/me"));
    } catch {
      ecrireJeton(null);
      return null;
    }
  }
  await delai();
  const compte = lireBase().comptes.find((c) => c.id === lireSession());
  return compte && compte.statut !== "suspendu" ? comptePublic(compte) : null;
}

function convertirCompte(compte) {
  return {
    ...compte,
    secteur: lireQuartiers()[compte.id] || "",
    nom: compte.full_name || compte.telephone || compte.email || "Compte FASO NEERE",
    role: String(compte.role || "CITOYEN").toLowerCase(),
    statut: compte.is_active ? "actif" : "suspendu",
  };
}

function rattacherSignalementsInvite(base, citoyenId, telephone) {
  const invite = idAppareil();
  const ussd = `ussd-${telephone}`;
  let nombre = 0;
  (base.echanges || []).forEach((e) => {
    if (e.citoyenId === ussd) {
      e.citoyenId = citoyenId;
      nombre += 1;
    }
  });
  base.signalements.forEach((s) => {
    if (s.auteurId === invite || s.auteurId === ussd) {
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
  if (apiActive) {
    const jeton = await requeteFormulaire("/api/v1/login/access-token", {
      username: normaliserTelephone(telephone),
      password,
    });
    ecrireJeton(jeton.access_token);
    ecrireAttente(null);
    const compte = convertirCompte(await requete("/api/v1/users/me"));
    if (compte.role === "admin") {
      ecrireJeton(null);
      throw new Error("Les comptes administrateur se connectent sur le tableau de bord web.");
    }
    if (compte.role === "citoyen") await rattacherSignalementsApi();
    return compte;
  }
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
    if (rattacherSignalementsInvite(base, compte.id, compte.telephone)) ecrireBase(base);
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

  if (apiActive && structure) {
    const manquante = piecesRequises(form.type).find((p) => p.obligatoire && !form.pieces[p.cle]);
    if (manquante) throw new Error(`Ajoutez le document : ${manquante.label.toLowerCase()}.`);
    const compte = await requete("/api/v1/structures/inscription", {
      methode: "POST",
      auth: false,
      corps: {
        nom: form.nom.trim(),
        telephone,
        password: form.password,
        responsable: form.responsable.trim(),
        type_structure: form.type,
        quartier: form.secteur,
        numero_cnib: form.numeroCnib.trim(),
        numero_enregistrement: form.numeroEnregistrement.trim(),
        ifu: form.ifu.trim(),
        numero_autorisation: form.numeroAutorisation.trim(),
        pieces: Object.fromEntries(Object.entries(form.pieces).filter(([, nom]) => nom)),
        conditions_acceptees: Boolean(form.conditionsAcceptees),
        conditions_version: VERSION_CONDITIONS,
        commission: COMMISSION,
      },
    });
    const enAttente = { ...convertirCompte(compte), role: "structure", statut: "en_attente", secteur: form.secteur };
    ecrireAttente(enAttente);
    return enAttente;
  }

  if (apiActive) {
    const compte = await requete("/api/v1/users/signup", {
      methode: "POST",
      auth: false,
      corps: {
        telephone,
        full_name: form.nom.trim(),
        password: form.password,
      },
    });
    const jeton = await requeteFormulaire("/api/v1/login/access-token", {
      username: telephone,
      password: form.password,
    });
    ecrireJeton(jeton.access_token);
    ecrireQuartier(compte.id, form.secteur);
    await rattacherSignalementsApi();
    return convertirCompte(compte);
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
  if (structure && form.numeroAutorisation.trim().length < 4) {
    throw new Error("Indiquez le numéro de l'autorisation de pré-collecte délivrée par la mairie.");
  }
  if (structure && !form.conditionsAcceptees) {
    throw new Error(`Acceptez les conditions de partenariat (commission de ${COMMISSION} %) pour créer un compte structure.`);
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
      numeroAutorisation: form.numeroAutorisation.trim().toUpperCase(),
      conditions: { version: VERSION_CONDITIONS, commission: COMMISSION, date: new Date().toISOString() },
      description: "",
      quartiers: [form.secteur],
      formules: [],
    });
  }

  if (!structure) rattacherSignalementsInvite(base, id, telephone);
  ecrireBase(base);
  ecrireSession(id);
  return comptePublic(compte);
}

export async function modifierMonProfil(id, { nom, secteur }) {
  if (nom.trim().length < 3) throw new Error("Le nom est trop court.");
  if (apiActive) {
    const compte = await requete("/api/v1/users/me", { methode: "PATCH", corps: { full_name: nom.trim() } });
    ecrireQuartier(id, secteur);
    return convertirCompte(compte);
  }
  await delai();
  const base = lireBase();
  const compte = base.comptes.find((c) => c.id === id);
  if (!compte) throw new Error("Compte introuvable.");
  compte.nom = nom.trim();
  compte.secteur = secteur;
  ecrireBase(base);
  return comptePublic(compte);
}
