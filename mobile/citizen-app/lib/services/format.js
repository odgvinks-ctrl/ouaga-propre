export function dateCourte(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function dateHeure(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function prix(montant) {
  return `${Number(montant).toLocaleString("fr-FR")} FCFA`;
}

export function prenom(nom) {
  return String(nom || "").split(" ")[0];
}

export function lienWhatsapp(numero) {
  return `https://wa.me/226${String(numero || "").replace(/\D/g, "").slice(-8)}`;
}

export function initiales(nom) {
  return String(nom || "")
    .split(" ")
    .filter(Boolean)
    .map((mot) => mot[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
