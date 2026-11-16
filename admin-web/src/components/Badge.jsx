export default function Badge({ statut, liste }) {
  const info = liste[statut] || { label: statut, classe: "statut-info" };
  return <span className={`badge ${info.classe}`}>{info.label}</span>;
}
