import { apiActive, requete } from "./http.js";

const CLE = "faso-neere-brigade-v2";

export const roles = {
  sensibilisation: { label: "Sensibilisation", court: "Sensibilisateur" },
  sanction: { label: "Contrôle et sanctions", court: "Agent de contrôle" },
  chef: { label: "Chef d'équipe", court: "Chef d'équipe" },
};

export const typesTache = {
  sensibilisation: "Sensibiliser les ménages d'un quartier",
  sanction: "Contrôler un lieu et sanctionner les contrevenants",
};

export const statutsTache = {
  a_faire: { label: "À faire", classe: "statut-attente" },
  en_cours: { label: "En cours", classe: "statut-info" },
  terminee: { label: "Terminée", classe: "statut-ok" },
  annulee: { label: "Annulée", classe: "statut-refus" },
};

export const infractions = {
  depot_sauvage: { label: "Dépôt d'ordures sur la voie publique", montant: 5000 },
  caniveau: { label: "Ordures ou eaux usées jetées dans un caniveau", montant: 10000 },
  brulage: { label: "Brûlage de déchets à l'air libre", montant: 5000 },
  recidive: { label: "Récidive après avertissement", montant: 25000 },
};

export const typesSanction = {
  avertissement: "Avertissement",
  amende: "Amende",
};

export const statutsSanction = {
  a_payer: { label: "À payer", classe: "statut-attente" },
  payee: { label: "Payée", classe: "statut-ok" },
  avertie: { label: "Avertissement donné", classe: "statut-info" },
  contestee: { label: "Contestée", classe: "statut-refus" },
  annulee: { label: "Annulée", classe: "statut-refus" },
};

const agentsDemo = [
  { nom: "Awa Sawadogo", telephone: "70110001", role: "chef", quartier: "Gounghin" },
  { nom: "Habibou Sanou", telephone: "70110002", role: "chef", quartier: "Tanghin" },
  { nom: "Mariam Ouédraogo", telephone: "70110003", role: "sensibilisation", quartier: "Gounghin" },
  { nom: "Fatimata Traoré", telephone: "70110004", role: "sensibilisation", quartier: "Koulouba" },
  { nom: "Salimata Kaboré", telephone: "70110005", role: "sensibilisation", quartier: "Paspanga" },
  { nom: "Issa Compaoré", telephone: "70110006", role: "sanction", quartier: "Tanghin" },
  { nom: "Adama Ouattara", telephone: "70110007", role: "sanction", quartier: "Nonsin" },
  { nom: "Rasmata Zongo", telephone: "70110008", role: "sanction", quartier: "Dapoya" },
];

function lire() {
  try {
    const donnees = JSON.parse(localStorage.getItem(CLE) || "null");
    if (donnees) return donnees;
  } catch {
    localStorage.removeItem(CLE);
  }
  const depart = {
    agents: agentsDemo.map((a, i) => ({ ...a, id: `agent-${i + 1}`, actif: true })),
    taches: [],
    sanctions: [],
  };
  ecrire(depart);
  return depart;
}

function ecrire(donnees) {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
  } catch {
    return;
  }
}

function nouvelId(prefixe) {
  return `${prefixe}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

let apiAbsente = false;

async function avecApi(appel, local) {
  if (!apiActive || apiAbsente) return local();
  try {
    return await appel();
  } catch (err) {
    if (err.statut !== 404 && err.statut !== 405) throw err;
    apiAbsente = true;
    return local();
  }
}

function convertirAgent(a) {
  return { id: a.id, nom: a.nom, telephone: a.telephone, role: a.role, quartier: a.quartier || "", actif: a.actif !== false };
}

function convertirTache(t) {
  return {
    id: t.id,
    type: t.type,
    quartier: t.quartier || "",
    lieu: t.lieu || "",
    consignes: t.consignes || "",
    date: t.date_prevue || t.date,
    agentIds: t.agent_ids || t.agentIds || [],
    signalementId: t.signalement_id || t.signalementId || null,
    statut: t.statut || "a_faire",
    creeLe: t.created_at || t.creeLe,
    termineeLe: t.terminee_le || t.termineeLe || null,
  };
}

export function agentsCompatibles(agents, type) {
  return agents.filter((a) => a.actif && (a.role === type || a.role === "chef"));
}

export async function listerAgents() {
  return avecApi(
    async () => (await requete("/api/v1/brigade/agents")).data.map(convertirAgent),
    () => lire().agents
  );
}

export async function ajouterAgent({ nom, telephone, role, quartier }) {
  if (!nom.trim()) throw new Error("Indiquez le nom de l'agent.");
  if (!/^\d{8}$/.test(telephone.replace(/\s/g, ""))) throw new Error("Le téléphone doit avoir 8 chiffres.");
  if (!roles[role]) throw new Error("Choisissez le rôle de l'agent.");
  const agent = { nom: nom.trim(), telephone: telephone.replace(/\s/g, ""), role, quartier };
  return avecApi(
    async () => convertirAgent(await requete("/api/v1/brigade/agents", { methode: "POST", corps: agent })),
    () => {
      const donnees = lire();
      if (donnees.agents.some((a) => a.telephone === agent.telephone)) throw new Error("Un agent utilise déjà ce numéro.");
      const nouveau = { ...agent, id: nouvelId("agent"), actif: true };
      donnees.agents.push(nouveau);
      ecrire(donnees);
      return nouveau;
    }
  );
}

export async function changerAgent(id, changement) {
  return avecApi(
    async () => convertirAgent(await requete(`/api/v1/brigade/agents/${id}`, { methode: "PATCH", corps: changement })),
    () => {
      const donnees = lire();
      const agent = donnees.agents.find((a) => a.id === id);
      if (!agent) throw new Error("Agent introuvable.");
      Object.assign(agent, changement);
      ecrire(donnees);
      return agent;
    }
  );
}

export async function listerTaches() {
  const taches = await avecApi(
    async () => (await requete("/api/v1/brigade/taches")).data.map(convertirTache),
    () => lire().taches
  );
  return [...taches].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function creerTache({ type, quartier, lieu, consignes, date, agentIds, signalementId }, agents) {
  if (!typesTache[type]) throw new Error("Choisissez le type de tâche.");
  if (!quartier) throw new Error("Choisissez le quartier.");
  if (!lieu.trim()) throw new Error("Indiquez le lieu précis.");
  if (!date) throw new Error("Choisissez la date de la tâche.");
  if (!agentIds.length) throw new Error("Assignez au moins un agent.");
  const autorises = agentsCompatibles(agents, type).map((a) => a.id);
  if (agentIds.some((id) => !autorises.includes(id))) throw new Error("Un agent choisi n'a pas le rôle demandé par cette tâche.");
  const corps = {
    type,
    quartier,
    lieu: lieu.trim(),
    consignes: consignes.trim(),
    date_prevue: new Date(date).toISOString(),
    agent_ids: agentIds,
    signalement_id: signalementId || null,
  };
  return avecApi(
    async () => convertirTache(await requete("/api/v1/brigade/taches", { methode: "POST", corps })),
    () => {
      const donnees = lire();
      const tache = convertirTache({ ...corps, id: nouvelId("tache"), statut: "a_faire", created_at: new Date().toISOString() });
      donnees.taches.push(tache);
      ecrire(donnees);
      return tache;
    }
  );
}

export async function changerStatutTache(id, statut) {
  if (!statutsTache[statut]) throw new Error("Statut inconnu.");
  return avecApi(
    async () => convertirTache(await requete(`/api/v1/brigade/taches/${id}/statut`, { methode: "PATCH", corps: { statut } })),
    () => {
      const donnees = lire();
      const tache = donnees.taches.find((t) => t.id === id);
      if (!tache) throw new Error("Tâche introuvable.");
      tache.statut = statut;
      tache.termineeLe = statut === "terminee" ? new Date().toISOString() : null;
      ecrire(donnees);
      return tache;
    }
  );
}

function convertirSanction(s) {
  return {
    id: s.id,
    type: s.type,
    infraction: s.infraction,
    montant: Number(s.montant || 0),
    contrevenant: s.contrevenant || "",
    telephone: s.telephone || "",
    quartier: s.quartier || "",
    lieu: s.lieu || "",
    agentId: s.agent_id || s.agentId,
    signalementId: s.signalement_id || s.signalementId || null,
    statut: s.statut,
    date: s.created_at || s.date,
  };
}

export function agentsDeControle(agents) {
  return agents.filter((a) => a.actif && (a.role === "sanction" || a.role === "chef"));
}

export async function listerSanctions() {
  const sanctions = await avecApi(
    async () => (await requete("/api/v1/brigade/sanctions")).data.map(convertirSanction),
    () => lire().sanctions || []
  );
  return [...sanctions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function creerSanction({ type, infraction, montant, contrevenant, telephone, quartier, lieu, agentId, signalementId }, agents) {
  if (!typesSanction[type]) throw new Error("Choisissez avertissement ou amende.");
  if (!infractions[infraction]) throw new Error("Choisissez l'infraction constatée.");
  if (!contrevenant.trim()) throw new Error("Indiquez le nom du contrevenant.");
  const numero = telephone.replace(/\s/g, "");
  if (numero && !/^\d{8}$/.test(numero)) throw new Error("Le téléphone doit avoir 8 chiffres.");
  if (!quartier) throw new Error("Choisissez le quartier.");
  if (!lieu.trim()) throw new Error("Indiquez le lieu de l'infraction.");
  if (!agentsDeControle(agents).some((a) => a.id === agentId)) throw new Error("Seul un agent de contrôle ou un chef d'équipe peut dresser une sanction.");
  const somme = type === "amende" ? Number(montant) : 0;
  if (type === "amende" && !(somme > 0)) throw new Error("Indiquez le montant de l'amende.");
  const corps = {
    type,
    infraction,
    montant: somme,
    contrevenant: contrevenant.trim(),
    telephone: numero,
    quartier,
    lieu: lieu.trim(),
    agent_id: agentId,
    signalement_id: signalementId || null,
  };
  return avecApi(
    async () => convertirSanction(await requete("/api/v1/brigade/sanctions", { methode: "POST", corps })),
    () => {
      const donnees = lire();
      const sanction = convertirSanction({ ...corps, id: nouvelId("sanction"), statut: type === "amende" ? "a_payer" : "avertie", created_at: new Date().toISOString() });
      donnees.sanctions = [...(donnees.sanctions || []), sanction];
      ecrire(donnees);
      return sanction;
    }
  );
}

export async function changerStatutSanction(id, statut) {
  if (!statutsSanction[statut]) throw new Error("Statut inconnu.");
  return avecApi(
    async () => convertirSanction(await requete(`/api/v1/brigade/sanctions/${id}/statut`, { methode: "PATCH", corps: { statut } })),
    () => {
      const donnees = lire();
      const sanction = (donnees.sanctions || []).find((s) => s.id === id);
      if (!sanction) throw new Error("Sanction introuvable.");
      sanction.statut = statut;
      ecrire(donnees);
      return sanction;
    }
  );
}

export function recidive(sanctions, telephone, contrevenant) {
  const numero = telephone.replace(/\s/g, "");
  const nom = contrevenant.trim().toLowerCase();
  if (!numero && !nom) return [];
  return sanctions.filter((s) => s.statut !== "annulee" && ((numero && s.telephone === numero) || (nom && s.contrevenant.toLowerCase() === nom)));
}
