import { lireBase, ecrireBase, delai, nouvelId } from "./base.js";

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
  await delai();
  const base = lireBase();
  return base.conversations
    .filter((c) => participe(c, moi))
    .map((c) => resume(base, c, moi))
    .sort((a, b) => (b.dernier?.date || "").localeCompare(a.dernier?.date || ""));
}

export async function compterNonLus(moi) {
  const liste = await getConversations(moi);
  return liste.reduce((total, c) => total + c.nonLus, 0);
}

export async function getConversation(id, moi) {
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
  await delai();
  const propre = texte.trim();
  if (!propre) throw new Error("Le message est vide.");
  const base = lireBase();
  const conversation = base.conversations.find((c) => c.id === id);
  if (!conversation || !participe(conversation, moi)) throw new Error("Conversation introuvable.");
  const date = new Date().toISOString();
  conversation.messages.push({ id: nouvelId("m"), auteurId: moi, texte: propre.slice(0, 1000), date });
  conversation.lectures = { ...(conversation.lectures || {}), [moi]: date };
  ecrireBase(base);
}
