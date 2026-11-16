import { base } from "../db/base.js";
import { requete } from "../api/http.js";

export async function ajouterEnvoi(type, chemin, corps) {
  return base.envois.add({ type, chemin, corps, statut: "attente", cree_le: Date.now() });
}

export async function synchroniser() {
  const enAttente = await base.envois.where("statut").equals("attente").toArray();
  for (const envoi of enAttente) {
    await base.envois.update(envoi.id, { statut: "encours" });
    try {
      await requete(envoi.chemin, { methode: "POST", corps: envoi.corps });
      await base.envois.update(envoi.id, { statut: "envoye" });
    } catch {
      await base.envois.update(envoi.id, { statut: "echec" });
    }
  }
}
