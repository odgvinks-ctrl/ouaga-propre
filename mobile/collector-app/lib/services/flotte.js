import { lireBase, ecrireBase, delai, nouvelId } from "@citoyen/services/base.js";
import { apiActive, requete } from "@citoyen/services/http.js";
import { idMaStructure } from "@citoyen/services/structures.js";

function convertirVehicule(v) {
  return { id: v.id, structureId: v.structure_id, nom: v.nom, type: v.type_vehicule, immatriculation: v.immatriculation || "", capacite: v.capacite, statut: v.statut };
}

function convertirMembre(e) {
  return { id: e.id, structureId: e.structure_id, nom: e.nom, role: e.role, telephone: e.telephone, vehiculeId: e.vehicule_id || "" };
}

export async function getVehicules(structureId) {
  if (apiActive) return (await requete(`/api/v1/vehicules/structure/${await idMaStructure()}`)).data.map(convertirVehicule);
  await delai();
  return lireBase().vehicules.filter((v) => v.structureId === structureId);
}

export async function enregistrerVehicule(structureId, vehicule) {
  await delai();
  if (!vehicule.nom.trim()) throw new Error("Donnez un nom au véhicule.");
  if (apiActive) {
    const corps = {
      nom: vehicule.nom.trim(),
      type_vehicule: vehicule.type,
      immatriculation: vehicule.immatriculation.trim().toUpperCase(),
      capacite: vehicule.capacite.trim() || "-",
    };
    if (vehicule.id) await requete(`/api/v1/vehicules/${vehicule.id}`, { methode: "PATCH", corps });
    else await requete(`/api/v1/vehicules/structure/${await idMaStructure()}`, { methode: "POST", corps: { ...corps, statut: "disponible" } });
    return;
  }
  const base = lireBase();
  const propre = {
    nom: vehicule.nom.trim(),
    type: vehicule.type,
    immatriculation: vehicule.immatriculation.trim().toUpperCase(),
    capacite: vehicule.capacite.trim(),
  };
  if (vehicule.id) {
    const existant = base.vehicules.find((v) => v.id === vehicule.id && v.structureId === structureId);
    if (!existant) throw new Error("Véhicule introuvable.");
    Object.assign(existant, propre);
  } else {
    base.vehicules.push({ id: nouvelId("v"), structureId, statut: "disponible", ...propre });
  }
  ecrireBase(base);
}

export async function changerStatutVehicule(structureId, id, statut) {
  if (apiActive) {
    await requete(`/api/v1/vehicules/${id}/statut?statut=${encodeURIComponent(statut)}`, { methode: "PATCH" });
    return;
  }
  await delai();
  const base = lireBase();
  const vehicule = base.vehicules.find((v) => v.id === id && v.structureId === structureId);
  if (!vehicule) throw new Error("Véhicule introuvable.");
  vehicule.statut = statut;
  ecrireBase(base);
}

export async function supprimerVehicule(structureId, id) {
  if (apiActive) {
    await requete(`/api/v1/vehicules/${id}`, { methode: "DELETE" });
    return;
  }
  await delai();
  const base = lireBase();
  base.vehicules = base.vehicules.filter((v) => !(v.id === id && v.structureId === structureId));
  base.equipes = base.equipes.map((e) => (e.vehiculeId === id ? { ...e, vehiculeId: "" } : e));
  ecrireBase(base);
}

export async function getEquipes(structureId) {
  if (apiActive) return (await requete(`/api/v1/equipes/structure/${await idMaStructure()}`)).data.map(convertirMembre);
  await delai();
  return lireBase().equipes.filter((e) => e.structureId === structureId);
}

export async function enregistrerMembre(structureId, membre) {
  await delai();
  if (membre.nom.trim().length < 3) throw new Error("Indiquez le nom du membre.");
  const telephone = membre.telephone.replace(/\D/g, "").slice(-8);
  if (telephone.length !== 8) throw new Error("Le numéro doit contenir 8 chiffres.");
  if (apiActive) {
    const corps = { nom: membre.nom.trim(), role: membre.role, telephone, vehicule_id: membre.vehiculeId || null };
    if (membre.id) await requete(`/api/v1/equipes/${membre.id}`, { methode: "PATCH", corps });
    else await requete(`/api/v1/equipes/structure/${await idMaStructure()}`, { methode: "POST", corps });
    return;
  }
  const base = lireBase();
  const propre = { nom: membre.nom.trim(), role: membre.role, telephone, vehiculeId: membre.vehiculeId };
  if (membre.id) {
    const existant = base.equipes.find((e) => e.id === membre.id && e.structureId === structureId);
    if (!existant) throw new Error("Membre introuvable.");
    Object.assign(existant, propre);
  } else {
    base.equipes.push({ id: nouvelId("e"), structureId, ...propre });
  }
  ecrireBase(base);
}

export async function supprimerMembre(structureId, id) {
  if (apiActive) {
    await requete(`/api/v1/equipes/${id}`, { methode: "DELETE" });
    return;
  }
  await delai();
  const base = lireBase();
  base.equipes = base.equipes.filter((e) => !(e.id === id && e.structureId === structureId));
  ecrireBase(base);
}
