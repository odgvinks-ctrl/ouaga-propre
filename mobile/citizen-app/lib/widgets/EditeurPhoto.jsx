import { useEffect, useRef, useState } from "react";
import { EyeOff, Undo2, ScanFace } from "lucide-react";
import { detecterVisages, detectionAutomatique, flouter } from "../services/photos.js";
import "./EditeurPhoto.css";

export default function EditeurPhoto({ source, zones, setZones }) {
  const ecran = useRef(null);
  const [trace, setTrace] = useState(null);
  const [recherche, setRecherche] = useState(false);
  const [trouves, setTrouves] = useState(null);

  useEffect(() => {
    if (!detectionAutomatique) return;
    setRecherche(true);
    detecterVisages(source)
      .then((visages) => {
        setTrouves(visages.length);
        if (visages.length) setZones((actuelles) => [...actuelles, ...visages]);
      })
      .finally(() => setRecherche(false));
  }, [source]);

  useEffect(() => {
    const canvas = ecran.current;
    if (!canvas) return;
    canvas.width = source.width;
    canvas.height = source.height;
    const contexte = canvas.getContext("2d");
    contexte.drawImage(flouter(source, zones), 0, 0);
    if (trace) {
      contexte.strokeStyle = "#ffffff";
      contexte.lineWidth = Math.max(3, source.width / 200);
      contexte.setLineDash([12, 8]);
      contexte.strokeRect(trace.x, trace.y, trace.largeur, trace.hauteur);
    }
  }, [source, zones, trace]);

  function point(e) {
    const cadre = ecran.current.getBoundingClientRect();
    return {
      x: ((e.clientX - cadre.left) / cadre.width) * source.width,
      y: ((e.clientY - cadre.top) / cadre.height) * source.height,
    };
  }

  function debut(e) {
    e.preventDefault();
    ecran.current.setPointerCapture(e.pointerId);
    const p = point(e);
    setTrace({ depart: p, x: p.x, y: p.y, largeur: 0, hauteur: 0 });
  }

  function mouvement(e) {
    if (!trace) return;
    const p = point(e);
    setTrace({
      ...trace,
      x: Math.min(trace.depart.x, p.x),
      y: Math.min(trace.depart.y, p.y),
      largeur: Math.abs(p.x - trace.depart.x),
      hauteur: Math.abs(p.y - trace.depart.y),
    });
  }

  function fin() {
    if (!trace) return;
    const minimum = source.width / 40;
    if (trace.largeur > minimum && trace.hauteur > minimum) {
      setZones([...zones, { x: trace.x, y: trace.y, largeur: trace.largeur, hauteur: trace.hauteur }]);
    }
    setTrace(null);
  }

  return (
    <div className="editeur-photo">
      <canvas
        ref={ecran}
        className="editeur-photo-image"
        onPointerDown={debut}
        onPointerMove={mouvement}
        onPointerUp={fin}
        onPointerCancel={fin}
        aria-label="Photo du signalement, glissez le doigt pour flouter une zone"
      />
      <div className="editeur-photo-aide">
        <EyeOff size={18} />
        <p>
          <strong>Protégez les passants.</strong> Glissez le doigt sur un visage ou une plaque d'immatriculation pour le flouter.
        </p>
      </div>
      <div className="editeur-photo-actions">
        {recherche && (
          <span className="editeur-photo-etat">
            <ScanFace size={16} /> Recherche des visages...
          </span>
        )}
        {!recherche && trouves > 0 && (
          <span className="editeur-photo-etat">
            <ScanFace size={16} /> {trouves} visage(s) flouté(s) automatiquement
          </span>
        )}
        {zones.length > 0 && (
          <button type="button" className="btn btn-secondaire" onClick={() => setZones(zones.slice(0, -1))}>
            <Undo2 size={16} /> Annuler le dernier flou
          </button>
        )}
      </div>
    </div>
  );
}
