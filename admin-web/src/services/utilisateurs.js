import { lireBase, ecrireBase, delai, comptePublic } from "@donnees/base.js";
import { apiActive, requete } from "./http.js";

async function listerApi() {
  const [utilisateurs, signalements] = await Promise.all([
    requete("/api/v1/users/?limit=500"),
    requete("/api/v1/signalements/admin?limit=100").catch(() => ({ data: [] })),
  ]);
  return utilisateurs.data.map((u) => {
    const siens = signalements.data.filter((s) => s.owner_id === u.id);
    return {
      id: u.id,
      nom: u.full_name || u.email || u.telephone || "Compte",
      telephone: u.telephone || u.email || "",
      role: String(u.role || "CITOYEN").toLowerCase(),
      statut: u.is_active ? "actif" : "suspendu",
      secteur: "",
      signalements: siens.length,
      rejetes: siens.filter((s) => s.statut === "REJETE").length,
      abonnement: "",
    };
  });
}

export async function listerUtilisateurs() {
  if (apiActive) return listerApi();
  await delai();
  const base = lireBase();
  return base.comptes.map((c) => {
    const signalements = base.signalements.filter((s) => s.auteurId === c.id);
    const abonnement = base.abonnements.find((a) => a.citoyenId === c.id && a.statut === "accepte");
    const structure = abonnement ? base.comptes.find((x) => x.id === abonnement.structureId) : null;
    return {
      ...comptePublic(c),
      signalements: signalements.length,
      rejetes: signalements.filter((s) => s.statut === "rejete").length,
      abonnement: structure ? structure.nom : "",
    };
  });
}

export async function changerStatutCompte(id, statut) {
  if (apiActive) {
    await requete(`/api/v1/users/${id}`, { methode: "PATCH", corps: { is_active: statut === "actif" } });
    return;
  }
  await delai();
  const base = lireBase();
  const compte = base.comptes.find((c) => c.id === id);
  if (!compte) throw new Error("Compte introuvable.");
  if (compte.role === "admin") throw new Error("Un compte administrateur ne peut pas être suspendu ici.");
  compte.statut = statut;
  ecrireBase(base);
}
