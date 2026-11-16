import { lireBase, ecrireBase, delai } from "@donnees/base.js";

export async function listerEchanges() {
  await delai();
  const base = lireBase();
  return (base.echanges || [])
    .map((e) => {
      const citoyen = base.comptes.find((c) => c.id === e.citoyenId) || {};
      const signalements = base.signalements.filter((s) => s.auteurId === e.citoyenId);
      return {
        ...e,
        citoyenNom: citoyen.nom || (String(e.citoyenId).startsWith("ussd-") ? "Téléphone simple (USSD)" : "Citoyen"),
        citoyenTelephone: citoyen.telephone || e.numero || "",
        valides: signalements.filter((s) => !["a_verifier", "rejete"].includes(s.statut)).length,
        rejetes: signalements.filter((s) => s.statut === "rejete").length,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function changerStatutEchange(id, statut) {
  await delai();
  const base = lireBase();
  const echange = (base.echanges || []).find((e) => e.id === id);
  if (!echange) throw new Error("Échange introuvable.");
  echange.statut = statut;
  echange.dateTraitement = new Date().toISOString();
  ecrireBase(base);
}
