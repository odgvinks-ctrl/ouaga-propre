import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  LocateFixed,
  TriangleAlert,
  MapPin,
  ChevronRight,
  Trash2,
  Waves,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { idAppareil } from "../services/invite.js";
import { creerSignalement, getSignalementsProches, confirmerSignalement } from "../services/signalements.js";
import { quartiers } from "../models/quartiers.js";
import { detecterQuartier } from "../services/localisation.js";
import { typesSignalement } from "../models/statuts.js";
import ChoixPosition from "../maps/ChoixPosition.jsx";
import "./Ecran.css";
import "./Signaler.css";

const tailles = [
  { cle: "petit", label: "Quelques sacs", icone: ShoppingBag, taille: 24 },
  { cle: "moyen", label: "Un gros tas", icone: Trash2, taille: 30 },
  { cle: "grand", label: "Un camion", icone: Truck, taille: 36 },
];

const icones = { depotoir: Trash2, caniveau: Waves };

const titres = ["Prenez une photo", "Où se trouve-t-il ?", "Qu'avez-vous vu ?"];

export default function CreerSignalement() {
  const { user } = useAuth();
  const auteurId = user ? user.id : idAppareil();
  const navigate = useNavigate();
  const [etape, setEtape] = useState(0);
  const [form, setForm] = useState({ type: "depotoir", taille: "moyen", description: "", quartier: user?.secteur || quartiers[0] });
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState("");
  const [gps, setGps] = useState(null);
  const [etatGps, setEtatGps] = useState("recherche");
  const [position, setPosition] = useState(null);
  const [quartierDetecte, setQuartierDetecte] = useState("");
  const [doublons, setDoublons] = useState([]);
  const [ignorer, setIgnorer] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  function localiser() {
    if (!navigator.geolocation) {
      setEtatGps("indisponible");
      return;
    }
    setEtatGps("recherche");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const trouve = { lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy) };
        setGps(trouve);
        setPosition(trouve);
        setEtatGps("trouve");
      },
      () => setEtatGps("refuse"),
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

  useEffect(() => {
    if (!position) return;
    detecterQuartier(position).then((trouve) => {
      if (!trouve) return;
      setQuartierDetecte(trouve);
      setForm((actuel) => ({ ...actuel, quartier: trouve }));
    });
    const minuteur = setTimeout(() => {
      getSignalementsProches(position).then((liste) => setDoublons(liste.filter((s) => s.auteurId !== auteurId)));
    }, 350);
    return () => clearTimeout(minuteur);
  }, [position, auteurId]);

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

  function deplacer(centre) {
    setPosition((actuelle) => ({ ...centre, precision: actuelle?.precision || null }));
    setIgnorer(false);
  }

  function retour() {
    if (etape === 0) {
      navigate(-1);
      return;
    }
    setEtape(etape - 1);
    setErreur("");
  }

  async function confirmer(id) {
    setChargement(true);
    try {
      await confirmerSignalement(id, auteurId);
      navigate("/signaler/envoye", { state: { confirme: true } });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChargement(true);
    try {
      const signalement = await creerSignalement(auteurId, { ...form, position, photo: photo ? photo.name : "" });
      navigate("/signaler/envoye", { state: { id: signalement.id } });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  const doublon = !ignorer && doublons[0];

  const entete = (
    <header className={etape === 1 ? "signaler-entete flottant" : "signaler-entete"}>
      <div className="tete-ecran">
        <button type="button" className="bouton-retour" onClick={retour}>
          <ArrowLeft size={18} /> Retour
        </button>
        <div>
          <span className="surtitre">Étape {etape + 1} sur 3</span>
          <h1>{titres[etape]}</h1>
        </div>
      </div>
      <span className="progression">
        {titres.map((t, i) => (
          <i key={t} className={i < etape ? "fait" : i === etape ? "courant signaler-courant" : ""}></i>
        ))}
      </span>
    </header>
  );

  if (etape === 0) {
    return (
      <section className="signaler">
        {entete}
        <div className="signaler-corps">
          <label className={apercu ? "signaler-photo pleine" : "signaler-photo"}>
            {apercu ? (
              <img src={apercu} alt="Photo du signalement" />
            ) : (
              <span>
                <Camera size={40} />
                <strong>Touchez pour prendre la photo</strong>
                <small>Montrez bien le tas ou le caniveau</small>
              </span>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={choisirPhoto} hidden />
          </label>
          {apercu && (
            <label className="btn btn-secondaire">
              <RotateCcw size={18} /> Reprendre la photo
              <input type="file" accept="image/*" capture="environment" onChange={choisirPhoto} hidden />
            </label>
          )}
        </div>
        <footer className="signaler-pied">
          <button type="button" className="btn btn-signaler btn-large" disabled={!photo} onClick={() => setEtape(1)}>
            Continuer <ChevronRight size={20} />
          </button>
        </footer>
      </section>
    );
  }

  if (etape === 1) {
    return (
      <section className="signaler signaler-carte">
        <div className="signaler-fond">
          <ChoixPosition cible={gps} doublons={doublons} onDeplacement={deplacer} />
          <div className="signaler-repere" aria-hidden="true">
            <span>Le problème est ici</span>
            <MapPin size={48} fill="#D71920" color="#FFFFFF" strokeWidth={1.5} />
          </div>
        </div>
        {entete}
        <p className="signaler-astuce">Faites glisser la carte, le repère reste au centre</p>
        <button type="button" className="signaler-localiser" onClick={localiser}>
          <LocateFixed size={18} /> Ma position
        </button>
        <div className="signaler-panneau">
          <span className="poignee" aria-hidden="true"></span>
          {doublon && (
            <div className="signaler-doublon" role="status">
              <p>
                <TriangleAlert size={20} />
                <span>
                  <strong>Déjà signalé à {doublon.distance} m.</strong> C'est le même ? Confirmez-le plutôt que d'en créer un nouveau.
                </span>
              </p>
              <div className="element-actions">
                <button type="button" className="btn btn-secondaire" disabled={chargement} onClick={() => confirmer(doublon.id)}>
                  Oui, le même
                </button>
                <button type="button" className="btn btn-secondaire" onClick={() => setIgnorer(true)}>
                  Non, un autre
                </button>
              </div>
            </div>
          )}
          <p className="signaler-gps">
            <MapPin size={20} />
            {etatGps === "trouve" && <span>Position trouvée{position?.precision ? ` · précision ${position.precision} m` : ""}</span>}
            {etatGps === "recherche" && <span>Recherche de votre position...</span>}
            {(etatGps === "refuse" || etatGps === "indisponible") && <span>GPS indisponible : placez le repère à la main</span>}
          </p>
          {erreur && <p className="message message-erreur">{erreur}</p>}
          <button type="button" className="btn btn-signaler btn-large" disabled={!position} onClick={() => setEtape(2)}>
            Continuer <ChevronRight size={20} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="signaler" onSubmit={handleSubmit}>
      {entete}
      <div className="signaler-corps">
        <div className="signaler-resume">
          <img src={apercu} alt="" />
          <span>
            <strong>Photo et position enregistrées</strong>
            <small>{position?.precision ? `Précision ${position.precision} m` : "Position choisie sur la carte"}</small>
          </span>
        </div>

        <span className="surtitre">Type</span>
        <div className="signaler-tuiles">
          {Object.entries(typesSignalement).map(([cle, label]) => {
            const Icone = icones[cle];
            return (
              <button
                key={cle}
                type="button"
                aria-pressed={form.type === cle}
                className={form.type === cle ? `signaler-tuile actif ${cle}` : `signaler-tuile ${cle}`}
                onClick={() => setForm({ ...form, type: cle })}
              >
                <i>
                  <Icone size={30} />
                </i>
                <strong>{label}</strong>
              </button>
            );
          })}
        </div>

        <span className="surtitre">Quelle taille ?</span>
        <div className="signaler-tuiles trois">
          {tailles.map(({ cle, label, icone: Icone, taille }) => (
            <button
              key={cle}
              type="button"
              aria-pressed={form.taille === cle}
              className={form.taille === cle ? "signaler-tuile centre actif" : "signaler-tuile centre"}
              onClick={() => setForm({ ...form, taille: cle })}
            >
              <Icone size={taille} />
              <strong>{label}</strong>
            </button>
          ))}
        </div>

        <label className="champ">
          Quartier
          <select name="quartier" value={form.quartier} onChange={handleChange}>
            {quartiers.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          {quartierDetecte && quartierDetecte === form.quartier && (
            <span className="champ-aide">Trouvé grâce à votre position. Changez-le s'il n'est pas bon.</span>
          )}
        </label>

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
      </div>
      <footer className="signaler-pied">
        <button type="submit" className="btn btn-signaler btn-large" disabled={chargement}>
          {chargement ? "Envoi..." : "Envoyer le signalement"}
        </button>
        <p className="champ-aide">Pas de réseau ? Il partira tout seul plus tard.</p>
      </footer>
    </form>
  );
}
