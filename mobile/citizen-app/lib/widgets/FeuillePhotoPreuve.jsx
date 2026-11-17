import { useState } from "react";
import { createPortal } from "react-dom";
import { Camera, RotateCcw } from "lucide-react";
import EditeurPhoto from "./EditeurPhoto.jsx";
import { preparerPhoto, flouter, exporterPhoto } from "../services/photos.js";
import "./FeuillePhotoPreuve.css";

export default function FeuillePhotoPreuve({ titre, texte, libelle = "Valider", onConfirmer, onAnnuler }) {
  const [source, setSource] = useState(null);
  const [zones, setZones] = useState([]);
  const [lecture, setLecture] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function choisirPhoto(e) {
    const fichier = e.target.files[0];
    e.target.value = "";
    if (!fichier) return;
    setLecture(true);
    try {
      setSource(await preparerPhoto(fichier));
      setZones([]);
      setErreur("");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLecture(false);
    }
  }

  async function valider() {
    setEnvoi(true);
    try {
      const photo = exporterPhoto(flouter(source, zones));
      await onConfirmer(photo.image);
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  return createPortal(
    <div className="voile" onClick={envoi ? undefined : onAnnuler}>
      <div className="feuille feuille-preuve" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <span className="poignee" aria-hidden="true"></span>
        <h2>{titre}</h2>
        {texte && <p className="element-meta">{texte}</p>}

        {source ? (
          <>
            <EditeurPhoto source={source} zones={zones} setZones={setZones} />
            <label className="btn btn-secondaire">
              <RotateCcw size={18} /> Reprendre la photo
              <input type="file" accept="image/*" capture="environment" onChange={choisirPhoto} hidden />
            </label>
          </>
        ) : (
          <label className="preuve-capture">
            <Camera size={34} />
            <strong>{lecture ? "Préparation de la photo..." : "Prendre la photo du lieu propre"}</strong>
            <small>Obligatoire pour clôturer</small>
            <input type="file" accept="image/*" capture="environment" onChange={choisirPhoto} hidden />
          </label>
        )}

        {erreur && <p className="message message-erreur">{erreur}</p>}

        <div className="element-actions">
          <button type="button" className="btn btn-secondaire" onClick={onAnnuler} disabled={envoi}>
            Annuler
          </button>
          <button type="button" className="btn btn-valider" onClick={valider} disabled={!source || envoi}>
            {envoi ? "Envoi..." : libelle}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
