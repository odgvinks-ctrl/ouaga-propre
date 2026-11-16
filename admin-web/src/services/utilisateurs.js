import { lireBase, ecrireBase, delai, comptePublic } from "@donnees/base.js";

export async function listerUtilisateurs() {
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
  await delai();
  const base = lireBase();
  const compte = base.comptes.find((c) => c.id === id);
  if (!compte) throw new Error("Compte introuvable.");
  if (compte.role === "admin") throw new Error("Un compte administrateur ne peut pas être suspendu ici.");
  compte.statut = statut;
  ecrireBase(base);
}
