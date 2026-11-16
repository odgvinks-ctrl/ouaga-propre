export default function EtatVide({ icone: Icone, titre, texte, children }) {
  return (
    <div className="etat-vide">
      {Icone && (
        <span className="etat-vide-icone" aria-hidden="true">
          <Icone size={22} />
        </span>
      )}
      <strong>{titre}</strong>
      {texte && <p>{texte}</p>}
      {children}
    </div>
  );
}
