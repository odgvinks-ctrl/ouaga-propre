export default function EtatVide({ titre, texte, children }) {
  return (
    <div className="etat-vide">
      <strong>{titre}</strong>
      {texte && <p>{texte}</p>}
      {children}
    </div>
  );
}
