import { apiActive, requete } from "./http.js";

const CLE = "faso-neere-brigade-v3";

export const typesTache = {
  sensibilisation: "Sensibilisation des ménages",
  sanction: "Contrôle et sanction",
};

export const statutsTache = {
  a_faire: { label: "Signalée", classe: "statut-attente" },
  en_cours: { label: "En cours", classe: "statut-info" },
  terminee: { label: "Traitée", classe: "statut-ok" },
  annulee: { label: "Annulée", classe: "statut-refus" },
};

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE) || "[]");
  } catch {
    return [];
  }
}

function ecrire(taches) {
  try {
    localStorage.setItem(CLE, JSON.stringify(taches));
  } catch {
    return;
  }
}

function nouvelId() {
  return `tache-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

function convertirTache(t) {
  return {
    id: t.id,
    type: t.type,
    quartier: t.quartier || "",
    lieu: t.lieu || "",
    consignes: t.consignes || "",
    date: t.date_prevue || t.date,
    signalementId: t.signalement_id || t.signalementId || null,
    statut: t.statut || "a_faire",
    creeLe: t.created_at || t.creeLe,
    termineeLe: t.terminee_le || t.termineeLe || null,
    position: Number.isFinite(t.latitude) && Number.isFinite(t.longitude) ? { lat: t.latitude, lng: t.longitude } : t.position || null,
  };
}

export async function listerTaches() {
  const taches = await avecApi(
    async () => (await requete("/api/v1/brigade/taches")).data.map(convertirTache),
    () => lire()
  );
  return [...taches].sort((a, b) => String(b.creeLe).localeCompare(String(a.creeLe)));
}

export function lienItineraire(position) {
  return `https://www.google.com/maps/dir/?api=1&destination=${position.lat},${position.lng}`;
}

export function messageBrigade(tache) {
  const lignes = [
    `FASO NEERE · Brigade Laabal : ${typesTache[tache.type]}`,
    `${tache.quartier} · ${tache.lieu}`,
    `Souhaité le ${new Date(tache.date).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`,
  ];
  if (tache.consignes) lignes.push(tache.consignes);
  if (tache.position) lignes.push(`Position : ${lienItineraire(tache.position)}`);
  return `https://wa.me/?text=${encodeURIComponent(lignes.join("\n"))}`;
}

export async function signalerTache({ type, quartier, lieu, consignes, date, signalementId, position }) {
  if (!typesTache[type]) throw new Error("Choisissez le type d'intervention.");
  if (!quartier) throw new Error("Choisissez le quartier.");
  if (!lieu.trim()) throw new Error("Indiquez le lieu précis.");
  if (!date) throw new Error("Choisissez la date souhaitée.");
  const corps = {
    type,
    quartier,
    lieu: lieu.trim(),
    consignes: consignes.trim(),
    date_prevue: new Date(date).toISOString(),
    signalement_id: signalementId || null,
    latitude: position ? position.lat : null,
    longitude: position ? position.lng : null,
  };
  return avecApi(
    async () => convertirTache(await requete("/api/v1/brigade/taches", { methode: "POST", corps })),
    () => {
      const tache = convertirTache({ ...corps, id: nouvelId(), statut: "a_faire", created_at: new Date().toISOString() });
      ecrire([...lire(), tache]);
      return tache;
    }
  );
}

export async function annulerTache(id) {
  return avecApi(
    async () => convertirTache(await requete(`/api/v1/brigade/taches/${id}/statut`, { methode: "PATCH", corps: { statut: "annulee" } })),
    () => {
      const taches = lire();
      const tache = taches.find((t) => t.id === id);
      if (!tache) throw new Error("Signalement introuvable.");
      tache.statut = "annulee";
      ecrire(taches);
      return tache;
    }
  );
}
