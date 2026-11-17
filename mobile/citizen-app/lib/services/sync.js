import { Network } from "@capacitor/network";
import { base } from "./stockage.js";
import { requete } from "./http.js";

const traitements = {};
const EVENEMENT = "faso-neere-envois";
let enCours = null;

export function traiterEnvoi(type, fonction) {
  traitements[type] = fonction;
}

export async function reseauDisponible() {
  if (navigator.onLine === false) return false;
  try {
    return (await Network.getStatus()).connected;
  } catch {
    return true;
  }
}

function prevenir() {
  window.dispatchEvent(new Event(EVENEMENT));
}

export function ecouterEnvois(fonction) {
  window.addEventListener(EVENEMENT, fonction);
  return () => window.removeEventListener(EVENEMENT, fonction);
}

export async function ajouterEnvoi(type, chemin, corps, apercu = {}) {
  const id = await base.envois.add({ type, chemin, corps, apercu, statut: "attente", cree_le: Date.now() });
  prevenir();
  return id;
}

export async function listerEnvois(type) {
  const liste = await base.envois.where("statut").anyOf("attente", "encours", "echec").toArray();
  return type ? liste.filter((e) => e.type === type) : liste;
}

async function executer() {
  const liste = await base.envois.where("statut").anyOf("attente", "echec", "encours").sortBy("cree_le");
  let envoyes = 0;
  for (const envoi of liste) {
    await base.envois.update(envoi.id, { statut: "encours" });
    try {
      const traitement = traitements[envoi.type];
      if (traitement) {
        await traitement(envoi.corps);
      } else {
        await requete(envoi.chemin, { methode: "POST", corps: envoi.corps });
      }
      await base.envois.delete(envoi.id);
      envoyes += 1;
    } catch (err) {
      await base.envois.update(envoi.id, { statut: err.horsLigne ? "attente" : "echec", erreur: err.message });
      if (err.horsLigne) break;
    }
  }
  prevenir();
  return envoyes;
}

export function synchroniser() {
  if (!enCours) enCours = executer().finally(() => (enCours = null));
  return enCours;
}
