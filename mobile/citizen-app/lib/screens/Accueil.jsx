import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Truck, WifiOff, Leaf, Building2, ChevronRight, Maximize2, LogIn } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { idAppareil } from "../services/invite.js";
import { useReseau } from "../providers/useReseau.js";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesAbonnements } from "../services/abonnements.js";
import { getMesCollectes } from "../services/collectes.js";
import { getMesSignalements, getDepotoirsCarte, getMesPoints } from "../services/signalements.js";
import { statutsSignalement, typesSignalement } from "../models/statuts.js";
import { etapesSignalement, rangEtape } from "../models/recompenses.js";
import { dateCourte, prenom, initiales } from "../services/format.js";
import CarteDepotoirs from "../maps/CarteDepotoirs.jsx";
import "./Ecran.css";
import "./Accueil.css";

export default function Accueil() {
  const { user } = useAuth();
  const enLigne = useReseau();
  const [abonnements, setAbonnements] = useState([]);
  const [collectes, setCollectes] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [points, setPoints] = useState([]);
  const [score, setScore] = useState(null);
  const [filtre, setFiltre] = useState("");
  const [moi, setMoi] = useState(null);

  async function charger() {
    const [mesAbonnements, mesCollectes, mesSignalements, carte, mesPoints] = await Promise.all([
      user ? getMesAbonnements(user.id) : [],
      user ? getMesCollectes(user.id) : [],
      getMesSignalements(user ? user.id : idAppareil()),
      getDepotoirsCarte(),
      user ? getMesPoints(user.id) : null,
    ]);
    setAbonnements(mesAbonnements);
    setCollectes(mesCollectes);
    setSignalements(mesSignalements);
    setPoints(carte);
    setScore(mesPoints);
  }

  useActualisation(charger, user?.id || "invite");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setMoi([p.coords.latitude, p.coords.longitude]),
      () => {},
      { timeout: 10000 }
    );
  }, []);

  const actif = abonnements.find((a) => a.statut === "accepte");
  const enAttente = abonnements.find((a) => a.statut === "en_attente");
  const prochaine = collectes.find((c) => c.statut === "planifiee");
  const dernier = signalements[0];
  const visibles = points.filter((p) => !filtre || p.type === filtre);
  const rang = dernier ? rangEtape(dernier.statut) : -1;

  let collecteTexte = user ? "Choisir une structure et s'abonner" : "Connectez-vous pour vous abonner";
  if (actif) {
    collecteTexte = prochaine ? `Passage le ${dateCourte(prochaine.datePrevue)}` : "Demander un passage";
  } else if (enAttente) {
    collecteTexte = "Demande d'abonnement en attente";
  }

  return (
    <section className="accueil">
      <div className="accueil-carte">
        <CarteDepotoirs points={visibles} centre={moi} moi={moi} hauteur="100%" arrondi={0} zoom={15} controles={false} />

        <header className="accueil-entete">
          {user ? (
            <Link to="/profil" className="accueil-avatar" aria-label="Mon profil">
              {initiales(user.nom)}
            </Link>
          ) : null}
          <div>
            <small>{user ? user.secteur || "Ouagadougou" : "Ouagadougou"}</small>
            <strong>{user ? `Bonjour ${prenom(user.nom)}` : "Bienvenue"}</strong>
          </div>
          {!user && (
            <Link to="/connexion" className="accueil-connexion">
              <LogIn size={15} /> Se connecter
            </Link>
          )}
          {score && (
            <Link to="/recompenses" className="accueil-points">
              <Leaf size={15} /> {score.solde} pts
            </Link>
          )}
        </header>

        <Link to="/carte" className="accueil-agrandir">
          <Maximize2 size={16} /> Carte en grand
        </Link>

        <div className="filtres accueil-filtres">
          <button type="button" className={filtre === "" ? "actif" : ""} onClick={() => setFiltre("")}>
            Tout · {points.length}
          </button>
          {Object.entries(typesSignalement).map(([cle, label]) => (
            <button key={cle} type="button" className={filtre === cle ? "actif" : ""} onClick={() => setFiltre(cle)}>
              {label.split(" ")[0]}s · {points.filter((p) => p.type === cle).length}
            </button>
          ))}
        </div>
      </div>

      <div className="accueil-panneau">
        <span className="poignee" aria-hidden="true"></span>

        {!enLigne && (
          <p className="message message-attention accueil-hors-ligne">
            <WifiOff size={20} />
            <span>
              <strong>Pas de réseau.</strong> Vos envois partiront dès que le réseau revient.
            </span>
          </p>
        )}

        <Link to="/signaler" className="btn btn-signaler btn-large">
          <Camera size={20} /> Signaler un dépotoir ou un caniveau
        </Link>

        <Link to="/collecte" className="groupe groupe-ligne accueil-collecte">
          <span className="accueil-collecte-icone">
            {actif || enAttente ? <Truck size={20} /> : <Building2 size={20} />}
          </span>
          <span>
            <strong>Ma collecte</strong>
            <small>{actif ? `${actif.structureNom} · ${collecteTexte}` : collecteTexte}</small>
          </span>
          <ChevronRight size={20} />
        </Link>

        {dernier && (
          <Link to={`/mes-signalements/${dernier.id}`} className="accueil-suivi">
            <span className="accueil-suivi-haut">
              <small>Mon dernier signalement</small>
              <span className={`badge ${statutsSignalement[dernier.statut].classe}`}>
                {statutsSignalement[dernier.statut].label}
              </span>
            </span>
            <strong>
              {typesSignalement[dernier.type]} · {dernier.quartier}
            </strong>
            {rang >= 0 && (
              <>
                <span className="progression">
                  {etapesSignalement.map((e, i) => (
                    <i key={e.statut} className={i < rang || rang === 4 ? "fait" : i === rang ? "courant" : ""}></i>
                  ))}
                </span>
                <small>
                  Étape {rang + 1} sur 5 · {etapesSignalement[rang].label}
                </small>
              </>
            )}
          </Link>
        )}

        {!user && (
          <p className="message message-info">
            Pas besoin de compte pour signaler. Avec un compte gratuit, vos signalements vous rapportent des points à échanger contre des unités ou de
            l'internet. <Link to="/inscription">Créer un compte</Link>
          </p>
        )}

        <Link to="/mes-signalements" className="groupe groupe-ligne">
          <span>{user ? "Tous mes signalements" : "Mes signalements sur ce téléphone"}</span>
          <span className="compteur">{signalements.length}</span>
          <ChevronRight size={20} />
        </Link>
      </div>
    </section>
  );
}
