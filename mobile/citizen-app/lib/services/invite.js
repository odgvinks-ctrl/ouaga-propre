const CLE = "faso-neere-appareil";

export function idAppareil() {
  try {
    let id = localStorage.getItem(CLE);
    if (!id) {
      id = `invite-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      localStorage.setItem(CLE, id);
    }
    return id;
  } catch {
    return "invite-anonyme";
  }
}

export function estInvite(id) {
  return String(id || "").startsWith("invite-");
}
