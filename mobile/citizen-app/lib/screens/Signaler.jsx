import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, LocateFixed } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { creerSignalement } from "../services/signalements.js";
import { quartiers } from "../models/quartiers.js";
import { typesSignalement, volumes } from "../models/statuts.js";
import "./Ecran.css";
import "./Signaler.css";

export default function Signaler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: "depotoir", taille: "moyen", description: "", quartier: user.secteur || quartiers[0] });
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState("");
  const [position, setPosition] = useState(null);
  const [gps, setGps] = useState("recherche");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  function localiser() {
    if (!navigator.geolocation) {
      setGps("indisponible");
      return;
    }
    setGps("recherche");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) });
        setGps("trouve");
      },
      () => setGps("refuse"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  useEffect(() => {
    localiser();
  }, []);

  useEffect(() => {
    return () => {
      if (apercu) URL.revokeObjectURL(apercu);
    };
  }, [apercu]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
  }

  function choisirPhoto(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    setPhoto(fichier);
    setApercu(URL.createObjectURL(fichier));
    setErreur("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      await creerSignalement(user.id, { ...form, position, photo: photo ? photo.name : "" });
      navigate("/envois", { state: { envoye: true } });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  const precisionBonne = position && position.precision <= 30;

  return (
    <section className="ecran">
      <h1>Signaler un problème</h1>

      <form className="formulaire" onSubmit={handleSubmit}>
        <div className="choix-groupe">
          {Object.entries(typesSignalement).map(([cle, label]) => (
            <button
              key={cle}
              type="button"
              className={form.type === cle ? "choix actif" : "choix"}
              onClick={() => setForm({ ...form, type: cle })}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="signaler-photo">
          {apercu ? (
            <img src={apercu} alt="Photo du signalement" />
          ) : (
            <span>
              <Camera size={34} />
              Prendre la photo
            </span>
          )}
          <input type="file" accept="image/*" capture="environment" onChange={choisirPhoto} hidden />
        </label>

        <div className="element signaler-gps">
          <LocateFixed size={24} />
          <div>
            {gps === "trouve" && (
              <>
                <strong>Position trouvée</strong>
                <span className="element-meta">
                  À {position.precision} m près · {precisionBonne ? "bonne précision" : "précision faible, rapprochez-vous"}
                </span>
              </>
            )}
            {gps === "recherche" && <strong>Recherche de votre position...</strong>}
            {gps === "refuse" && <strong>Position non disponible</strong>}
            {gps === "indisponible" && <strong>GPS indisponible sur cet appareil</strong>}
          </div>
          {gps !== "trouve" && gps !== "recherche" && (
            <button type="button" className="btn btn-secondaire" onClick={localiser}>
              Réessayer
            </button>
          )}
        </div>

        <label className="champ">
          Secteur
          <select name="quartier" value={form.quartier} onChange={handleChange}>
            {quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>

        <div className="champ">
          Taille
          <div className="choix-groupe">
            {Object.entries(volumes).map(([cle, label]) => (
              <button
                key={cle}
                type="button"
                className={form.taille === cle ? "choix actif" : "choix"}
                onClick={() => setForm({ ...form, taille: cle })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="champ">
          Précisions (facultatif)
          <textarea
            name="description"
            placeholder="Ex. derrière le marché, odeur forte..."
            value={form.description}
            onChange={handleChange}
            maxLength={300}
          />
        </label>

        {erreur && <p className="message message-erreur">{erreur}</p>}

        <button type="submit" className="btn btn-signaler btn-large" disabled={chargement}>
          {chargement ? "Envoi..." : "Envoyer le signalement"}
        </button>
        <p className="champ-aide">L'administration vérifie chaque signalement puis le transmet à la structure du secteur.</p>
      </form>
    </section>
  );
}
