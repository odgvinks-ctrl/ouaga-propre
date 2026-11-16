import { createPortal } from "react-dom";

export default function FeuilleConfirmation({ titre, texte, libelle = "Confirmer", danger = false, onConfirmer, onAnnuler }) {
  return createPortal(
    <div className="voile" onClick={onAnnuler}>
      <div className="feuille" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <span className="poignee" aria-hidden="true"></span>
        <h2>{titre}</h2>
        {texte && <p className="element-meta">{texte}</p>}
        <div className="element-actions">
          <button type="button" className="btn btn-secondaire" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="button" className={danger ? "btn btn-refuser" : "btn btn-primaire"} onClick={onConfirmer}>
            {libelle}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
