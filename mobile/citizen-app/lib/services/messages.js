import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";
import { apiActive, requete } from "./http.js";

function decouper(id) {
  const [citoyenId, structureId] = String(id).split("__");
  return { citoyenId, structureId };
}

function resumeApi(c, moi) {
  const citoyen = c.citoyen_id === moi;
  return {
    id: c.id,
    autreNom: citoyen ? c.structure_nom : c.citoyen_nom,
    autreTelephone: citoyen ? "" : c.citoyen_telephone,
    dernier: { texte: c.dernier_texte, auteurId: c.dernier_auteur, date: c.date },
    nonLus: c.non_lus,
  };
}

function participe(conversation, moi) {
  return conversation.citoyenId === moi || conversation.structureId === moi;
}

function resume(base, conversation, moi) {
  const autreId = moi === conversation.citoyenId ? conversation.structureId : conversation.citoyenId;
  const autre = base.comptes.find((c) => c.id === autreId) || {};
  const dernier = conversation.messages[conversation.messages.length - 1] || null;
  const lu = (conversation.lectures || {})[moi] || "";
  const nonLus = conversation.messages.filter((m) => m.auteurId !== moi && m.date > lu).length;
  return { id: conversation.id, autreNom: autre.nom || "Utilisateur", autreTelephone: autre.telephone || "", dernier, nonLus };
}

export async function getConversations(moi) {
  if (apiActive) {
    const liste = await requete("/api/v1/messages/conversations");
    return liste.map((c) => resumeApi(c, moi)).sort((a, b) => (b.dernier?.date || "").localeCompare(a.dernier?.date || ""));
  }
  await delai();
  const base = lireBase();
  return base.conversations
    .filter((c) => participe(c, moi))
    .map((c) => resume(base, c, moi))
    .sort((a, b) => (b.dernier?.date || "").localeCompare(a.dernier?.date || ""));
}

export async function compterNonLus(moi) {
  if (apiActive) return (await requete("/api/v1/messages/nonlus")).count;
  const liste = await getConversations(moi);
  return liste.reduce((total, c) => total + c.nonLus, 0);
}

export async function getConversation(id, moi) {
  if (apiActive) {
    const { citoyenId, structureId } = decouper(id);
    const [resultat, liste] = await Promise.all([
      requete(`/api/v1/messages/conversation/${citoyenId}/${structureId}`),
      requete("/api/v1/messages/conversations"),
    ]);
    const infos = liste.find((c) => c.id === id);
    let autreNom = infos ? resumeApi(infos, moi).autreNom : "";
    if (!autreNom) {
      const fiche = await requete(`/api/v1/structures/${structureId}`, { auth: false }).catch(() => null);
      autreNom = citoyenId === moi ? fiche?.nom || "Structure" : "Citoyen";
    }
    return {
      id,
      autreNom,
      autreTelephone: infos && citoyenId !== moi ? infos.citoyen_telephone : "",
      nonLus: 0,
      dernier: null,
      messages: resultat.data.map((m) => ({ id: m.id, auteurId: m.expediteur_id, texte: m.texte, date: m.date })),
    };
  }
  await delai();
  const base = lireBase();
  const conversation = base.conversations.find((c) => c.id === id);
  if (!conversation || !participe(conversation, moi)) throw new Error("Conversation introuvable.");
  const infos = resume(base, conversation, moi);
  if (infos.nonLus > 0) {
    conversation.lectures = { ...(conversation.lectures || {}), [moi]: new Date().toISOString() };
    ecrireBase(base);
  }
  return { ...infos, messages: conversation.messages };
}

export async function demarrerConversation(citoyenId, structureId) {
  if (apiActive) return `${citoyenId}__${structureId}`;
  await delai();
  const base = lireBase();
  const id = `${citoyenId}__${structureId}`;
  if (!base.conversations.some((c) => c.id === id)) {
    base.conversations.push({ id, citoyenId, structureId, messages: [], lectures: {} });
    ecrireBase(base);
  }
  return id;
}

export async function envoyerMessage(id, moi, texte) {
  const propre = texte.trim();
  if (!propre) throw new Error("Le message est vide.");
  if (apiActive) {
    const { citoyenId, structureId } = decouper(id);
    await requete(`/api/v1/messages/conversation/${citoyenId}/${structureId}`, {
      methode: "POST",
      corps: { conversation_id: id, texte: propre.slice(0, 1000) },
    });
    return;
  }
  await delai();
  const base = lireBase();
  const conversation = base.conversations.find((c) => c.id === id);
  if (!conversation || !participe(conversation, moi)) throw new Error("Conversation introuvable.");
  const date = new Date().toISOString();
  conversation.messages.push({ id: nouvelId("m"), auteurId: moi, texte: propre.slice(0, 1000), date });
  conversation.lectures = { ...(conversation.lectures || {}), [moi]: date };
  ecrireBase(base);
}
