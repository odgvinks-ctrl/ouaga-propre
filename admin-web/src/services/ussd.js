import { lireBase, ecrireBase, delai, nouvelId } from "@donnees/base.js";
import { getMesPoints } from "@donnees/signalements.js";
import { echangerPoints } from "@donnees/recompenses.js";
import { quartiers } from "@modeles/quartiers.js";
import { cadeaux, operateurs } from "@modeles/recompenses.js";
import { statutsSignalement } from "@modeles/statuts.js";
import { apiActive, requete } from "./http.js";

const CLE_API = "faso-neere-ussd-api";
const statutsApi = {
  NOUVEAU: "a_verifier",
  EN_VERIFICATION: "a_verifier",
  VALIDE: "verifie",
  TRANSMIS: "transmis",
  EN_COURS: "pris_en_charge",
  RESOLU: "nettoye",
  REJETE: "rejete",
};
const etapesOrdre = ["a_verifier", "verifie", "transmis", "pris_en_charge", "nettoye"];

function lireSuivis() {
  try {
    return JSON.parse(localStorage.getItem(CLE_API) || "{}");
  } catch {
    return {};
  }
}

function ajouterSuivi(telephone, suivi) {
  const tous = lireSuivis();
  tous[telephone] = [...(tous[telephone] || []), suivi];
  localStorage.setItem(CLE_API, JSON.stringify(tous));
}

async function signalementsApi(telephone) {
  const suivis = telephone ? lireSuivis()[telephone] || [] : Object.entries(lireSuivis()).flatMap(([tel, liste]) => liste.map((x) => ({ ...x, telephone: tel })));
  const resultats = await Promise.all(
    suivis.map((x) =>
      requete("/api/v1/signalements/suivi", { methode: "POST", auth: false, corps: { reference: x.reference } })
        .then((s) => ({
          id: s.id,
          telephone: x.telephone || telephone,
          type: String(s.type_signalement).includes("CANIVEAU") ? "caniveau" : "depotoir",
          quartier: s.quartier || "",
          statut: statutsApi[s.statut] || "a_verifier",
          date: s.created_at,
          structureId: s.structure_id,
          canal: "ussd",
          historique: [],
        }))
        .catch(() => null)
    )
  );
  return resultats
    .filter(Boolean)
    .map((s) => {
      const atteint = s.statut === "rejete" ? ["a_verifier", "rejete"] : etapesOrdre.slice(0, etapesOrdre.indexOf(s.statut) + 1);
      return { ...s, historique: atteint.map((statut) => ({ statut, date: s.date })) };
    });
}

async function soldeApi(telephone) {
  const liste = await signalementsApi(telephone);
  const valides = liste.filter((s) => !["a_verifier", "rejete"].includes(s.statut));
  const gagnes = valides.length * 10 + valides.filter((s) => s.statut === "nettoye").length * 5;
  const depenses = (lireBase().echanges || [])
    .filter((e) => e.citoyenId === auteurUssd(telephone) && e.statut !== "refuse")
    .reduce((t, e) => t + e.cout, 0);
  return { solde: gagnes - depenses, enAttente: liste.filter((s) => s.statut === "a_verifier").length * 10 };
}

export const CODE_USSD = "*226#";

const typesCourts = { depotoir: "Dépotoir", caniveau: "Caniveau bouché" };
const taillesUssd = {
  depotoir: ["Petit (quelques sacs)", "Moyen (une charrette)", "Grand (un camion)"],
  caniveau: ["Petit (quelques mètres)", "Moyen (une rue)", "Grand (tout le quartier)"],
};
const cleTailles = ["petit", "moyen", "grand"];
const cadeauxUssd = ["sms-100", "unites-500", "mega-500"].map((cle) => cadeaux.find((c) => c.cle === cle));

const menu =
  "FASO NEERE\n1. Signaler un dépotoir\n2. Signaler un caniveau bouché\n3. Suivre mes signalements\n4. Mes points et cadeaux\n0. Quitter";

export function normaliser(texte) {
  return String(texte || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function reference(id) {
  return `S-${String(id).slice(-4).toUpperCase()}`;
}

export function auteurUssd(telephone) {
  const compte = lireBase().comptes.find((c) => c.role === "citoyen" && c.telephone === telephone);
  return compte ? compte.id : `ussd-${telephone}`;
}

function ecran(session, texte, fin = false) {
  return { session: fin ? null : session, texte, fin };
}

function listeQuartiers(trouves) {
  return trouves.map((q, i) => `${i + 1}. ${q}`).join("\n");
}

export function demarrer(telephone, code) {
  if (code.replace(/\s/g, "") !== CODE_USSD) return ecran(null, `Code inconnu.\nComposez ${CODE_USSD} pour FASO NEERE.`, true);
  return ecran({ telephone, etape: "menu", donnees: {} }, menu);
}

export async function repondre(session, saisie) {
  await delai(350);
  const choix = String(saisie || "").trim();
  const { etape, donnees, telephone } = session;
  const suite = (nouvelleEtape, texte, ajout = {}) => ecran({ ...session, etape: nouvelleEtape, donnees: { ...donnees, ...ajout } }, texte);

  if (etape === "menu") {
    if (choix === "1" || choix === "2") {
      const type = choix === "1" ? "depotoir" : "caniveau";
      const options = taillesUssd[type].map((t, i) => `${i + 1}. ${t}`).join("\n");
      return suite("taille", `Quelle taille ?\n${options}`, { type });
    }
    if (choix === "3") return ecran(null, await suivi(telephone), true);
    if (choix === "4") return points(session);
    if (choix === "0") return ecran(null, "Merci. Ensemble pour un Faso propre !", true);
    return ecran(session, `Choix invalide.\n${menu}`);
  }

  if (etape === "taille") {
    const index = Number(choix) - 1;
    if (!cleTailles[index]) return ecran(session, "Tapez 1, 2 ou 3 pour la taille.");
    return suite("quartier", "Tapez les premières lettres de votre quartier\n(ex : PAS pour Paspanga)", { taille: cleTailles[index] });
  }

  if (etape === "quartier") {
    const cherche = normaliser(choix);
    if (cherche.length < 2) return ecran(session, "Tapez au moins 2 lettres de votre quartier :");
    const debut = quartiers.filter((q) => normaliser(q).startsWith(cherche));
    const trouves = [...debut, ...quartiers.filter((q) => !debut.includes(q) && normaliser(q).includes(cherche))];
    if (!trouves.length) return ecran(session, "Aucun quartier trouvé.\nTapez à nouveau les premières lettres :");
    const affiches = trouves.slice(0, 7);
    const plus = trouves.length > affiches.length ? "\nTapez plus de lettres si le vôtre n'y est pas." : "";
    return suite("choix-quartier", `Votre quartier :\n${listeQuartiers(affiches)}\n0. Retaper${plus}`, { trouves: affiches });
  }

  if (etape === "choix-quartier") {
    if (choix === "0") return suite("quartier", "Tapez les premières lettres de votre quartier :");
    const quartier = donnees.trouves[Number(choix) - 1];
    if (!quartier) return ecran(session, `Choix invalide.\n${listeQuartiers(donnees.trouves)}\n0. Retaper`);
    return suite("repere", "Un repère pour trouver le lieu\n(ex : derrière le marché)\nTapez 0 pour passer :", { quartier });
  }

  if (etape === "repere") {
    const repere = choix === "0" ? "" : choix.slice(0, 120);
    const resume = `${typesCourts[donnees.type]}, ${donnees.taille}\nQuartier : ${donnees.quartier}${repere ? `\nRepère : ${repere}` : ""}`;
    return suite("confirmation", `${resume}\n1. Envoyer\n2. Annuler`, { repere });
  }

  if (etape === "confirmation") {
    if (choix === "2") return ecran(null, "Signalement annulé.", true);
    if (choix !== "1") return ecran(session, "Tapez 1 pour envoyer ou 2 pour annuler.");
    const signalement = await enregistrer(telephone, donnees);
    return ecran(null, `Merci ! Signalement ${reference(signalement.id)} enregistré.\nVous recevrez un SMS à chaque étape.`, true);
  }

  if (etape === "points") {
    if (choix === "0") return ecran({ ...session, etape: "menu" }, menu);
    const cadeau = cadeauxUssd[Number(choix) - 1];
    if (!cadeau) return points(session, "Choix invalide.");
    if (donnees.solde < cadeau.cout) return ecran(null, `Il vous manque ${cadeau.cout - donnees.solde} points pour ${cadeau.label}.\nContinuez à signaler !`, true);
    const options = operateurs.map((o, i) => `${i + 1}. ${o}`).join("\n");
    return suite("operateur", `${cadeau.label} sur le ${telephone}.\nVotre opérateur :\n${options}`, { cadeauCle: cadeau.cle });
  }

  if (etape === "operateur") {
    const operateur = operateurs[Number(choix) - 1];
    if (!operateur) return ecran(session, "Tapez 1, 2 ou 3 pour votre opérateur.");
    try {
      const echange = await echangerPoints(auteurUssd(telephone), {
        cadeauCle: donnees.cadeauCle,
        operateur,
        numero: telephone,
        soldeConnu: apiActive ? (await soldeApi(telephone)).solde : undefined,
      });
      return ecran(null, `Demande enregistrée : ${echange.label}.\nVous serez servi sous 48 h.`, true);
    } catch (e) {
      return ecran(null, e.message, true);
    }
  }

  return ecran(null, "Session terminée.", true);
}

async function points(session, prefixe = "") {
  const { solde, enAttente } = apiActive ? await soldeApi(session.telephone) : await getMesPoints(auteurUssd(session.telephone));
  const options = cadeauxUssd.map((c, i) => `${i + 1}. ${c.label} (${c.cout} pts)`).join("\n");
  const attente = enAttente ? `\n+${enAttente} en vérification` : "";
  const texte = `${prefixe ? `${prefixe}\n` : ""}Vous avez ${solde} points.${attente}\n${options}\n0. Retour`;
  return ecran({ ...session, etape: "points", donnees: { solde } }, texte);
}

async function enregistrer(telephone, donnees) {
  if (apiActive) {
    const cree = await requete("/api/v1/signalements/", {
      methode: "POST",
      auth: false,
      corps: {
        type_signalement: donnees.type === "caniveau" ? "CANIVEAU_OBSTRUE" : "DEPOTOIR_SAUVAGE",
        description: `Signalé par USSD (${telephone}), taille ${donnees.taille}${donnees.repere ? ` : ${donnees.repere}` : ""}`,
        latitude: 12.3714,
        longitude: -1.5197,
        adresse: donnees.repere || null,
        quartier: donnees.quartier,
      },
    });
    ajouterSuivi(telephone, { id: cree.id, reference: cree.tracking_reference });
    return cree;
  }
  const base = lireBase();
  const maintenant = new Date().toISOString();
  const signalement = {
    id: nouvelId("s"),
    auteurId: auteurUssd(telephone),
    canal: "ussd",
    telephone,
    type: donnees.type,
    taille: donnees.taille,
    description: donnees.repere,
    quartier: donnees.quartier,
    position: null,
    photo: null,
    statut: "a_verifier",
    structureId: null,
    historique: [{ statut: "a_verifier", date: maintenant }],
    confirmations: [],
    date: maintenant,
  };
  base.signalements.push(signalement);
  ecrireBase(base);
  return signalement;
}

async function suivi(telephone) {
  const auteur = auteurUssd(telephone);
  const source = apiActive ? await signalementsApi(telephone) : lireBase().signalements.filter((s) => s.auteurId === auteur);
  const miens = source
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  if (!miens.length) return "Aucun signalement pour ce numéro.\nComposez *226# puis 1 pour signaler.";
  return `Vos signalements :\n${miens.map((s) => `${reference(s.id)} ${s.quartier} : ${statutsSignalement[s.statut].label}`).join("\n")}`;
}

function texteSms(s, etape, structures) {
  const ref = reference(s.id);
  const structure = structures[s.structureId] || "une structure de pré-collecte";
  const textes = {
    a_verifier: `Signalement ${ref} reçu (${typesCourts[s.type]}, ${s.quartier}). La mairie va le vérifier.`,
    transmis: `${ref} vérifié par la mairie et confié à ${structure}.`,
    pris_en_charge: `${structure} intervient sur ${ref} (${s.quartier}).`,
    nettoye: `${ref} : le lieu est nettoyé. Merci ! Vos points sont crédités.`,
    rejete: `${ref} n'a pas été retenu${s.motifRejet ? ` : ${s.motifRejet}` : ""}.`,
  };
  return textes[etape.statut] ? `FASO NEERE : ${textes[etape.statut]}` : "";
}

export async function getSms(telephone) {
  await delai(60);
  if (!telephone) return [];
  const base = lireBase();
  const auteur = auteurUssd(telephone);
  const structures = Object.fromEntries(base.comptes.map((c) => [c.id, c.nom]));
  if (apiActive) {
    const fiches = await requete("/api/v1/structures/", { auth: false }).catch(() => ({ data: [] }));
    fiches.data.forEach((f) => {
      structures[f.id] = f.nom;
    });
  }
  const messages = [];
  const source = apiActive ? await signalementsApi(telephone) : base.signalements.filter((s) => s.auteurId === auteur && s.canal === "ussd");
  source
    .forEach((s) =>
      (s.historique || []).forEach((etape, i) => {
        const texte = texteSms(s, etape, structures);
        if (texte) messages.push({ id: `${s.id}-${i}`, texte, date: etape.date });
      })
    );
  (base.echanges || [])
    .filter((e) => e.citoyenId === auteur && e.statut !== "en_attente")
    .forEach((e) =>
      messages.push({
        id: e.id,
        texte: e.statut === "envoye" ? `FASO NEERE : votre cadeau ${e.label} a été envoyé. Merci pour Ouaga !` : `FASO NEERE : votre demande ${e.label} n'a pas pu être servie.`,
        date: e.dateTraitement || e.date,
      })
    );
  return messages.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getStatistiquesUssd() {
  await delai(60);
  const liste = apiActive ? await signalementsApi() : lireBase().signalements.filter((s) => s.canal === "ussd");
  const mois = new Date().toISOString().slice(0, 7);
  return {
    total: liste.length,
    ceMois: liste.filter((s) => s.date.startsWith(mois)).length,
    numeros: new Set(liste.map((s) => s.telephone)).size,
    nettoyes: liste.filter((s) => s.statut === "nettoye").length,
    derniers: [...liste].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
  };
}
