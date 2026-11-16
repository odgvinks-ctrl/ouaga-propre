import { createPortal } from "react-dom";

export default function Dialogue({ titre, children, onFermer }) {
  return createPortal(
    <div className="voile" onClick={onFermer}>
      <div className="dialogue" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <h2>{titre}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
