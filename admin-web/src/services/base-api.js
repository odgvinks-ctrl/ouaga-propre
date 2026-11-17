import { lireBase } from "@donnees/base.js";
import { apiActive, requete } from "./http.js";
import { listerSignalements } from "./signalements.js";
import { listerStructures } from "./structures.js";

let derniere = null;

function versDate(valeur) {
  if (!valeur) return null;
  return new Date(/Z$|[+-]\d\d:\d\d$/.test(valeur) ? valeur : `${valeur}Z`).toISOString();
}

async function parStructure(structures, chemin, convertir) {
  const listes = await Promise.all(
    structures.map((s) =>
      requete(`/api/v1/${chemin}/structure/${s.id}`)
        .then((r) => r.data.map((x) => convertir(x, s)))
        .catch(() => [])
    )
  );
  return listes.flat();
}

export async function chargerBase() {
  if (!apiActive) return lireBase();
  const [signalements, structures, utilisateurs] = await Promise.all([
    listerSignalements(),
    listerStructures(),
    requete("/api/v1/users/?limit=500").catch(() => ({ data: [] })),
  ]);
  const actives = structures.filter((s) => s.statut === "actif" || s.statut === "suspendu");
  const [abonnements, collectes, vehicules] = await Promise.all([
    parStructure(actives, "abonnements", (a) => ({
      id: a.id,
      citoyenId: a.citoyen_id,
      structureId: a.structure_id,
      statut: a.statut,
      quartier: a.quartier,
      date: versDate(a.created_at),
      position: null,
    })),
    parStructure(actives, "collectes", (c) => ({
      id: c.id,
      citoyenId: c.citoyen_id,
      structureId: c.structure_id,
      statut: c.statut,
      datePrevue: versDate(c.date_prevue),
      date: versDate(c.date),
    })),
    parStructure(actives, "vehicules", (v) => ({ id: v.id, structureId: v.structure_id, statut: v.statut })),
  ]);
  const comptes = [
    ...utilisateurs.data
      .filter((u) => String(u.role).toUpperCase() !== "STRUCTURE")
      .map((u) => ({
        id: u.id,
        nom: u.full_name || u.email || u.telephone,
        telephone: u.telephone || "",
        role: String(u.role || "CITOYEN").toLowerCase(),
        statut: u.is_active ? "actif" : "suspendu",
      })),
    ...structures.map((s) => ({ id: s.id, nom: s.nom, telephone: s.telephone, role: "structure", statut: s.statut })),
  ];
  derniere = {
    ...lireBase(),
    signalements,
    comptes,
    structures,
    abonnements,
    collectes,
    vehicules,
    echanges: [],
  };
  return derniere;
}

export function derniereBase() {
  return derniere || lireBase();
}
