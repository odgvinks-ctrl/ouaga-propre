export const accueils = ["/", "/gestion", "/connexion", "/validation"];

export function parent(chemin) {
  const morceaux = chemin.split("/").filter(Boolean);
  morceaux.pop();
  if (chemin.startsWith("/gestion") && morceaux.length < 1) return "/gestion";
  return `/${morceaux.join("/")}`;
}
