import Dexie from "dexie";

export const base = new Dexie("ouaga-propre");

base.version(1).stores({
  envois: "++id, type, statut, cree_le",
  ma_tournee_locale: "id, ordre, statut",
});
