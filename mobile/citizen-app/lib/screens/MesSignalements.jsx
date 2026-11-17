import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Camera, Trash2, Waves, CloudUpload } from "lucide-react";
import { useAuth } from "../providers/AuthContext.jsx";
import { idAppareil } from "../services/invite.js";
import { useActualisation } from "../providers/useActualisation.js";
import { getMesSignalements } from "../services/signalements.js";
import { statutsSignalement, typesSignalement, volumes } from "../models/statuts.js";
import { etapesSignalement, rangEtape } from "../models/recompenses.js";
import { dateCourte } from "../services/format.js";
import { ecouterEnvois } from "../services/sync.js";
import Badge from "../widgets/Badge.jsx";
import EtatVide from "../widgets/EtatVide.jsx";
import "./Ecran.css";

export default function MesSignalements() {
  const { user } = useAuth();
  const auteurId = user ? user.id : idAppareil();
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    setSignalements(await getMesSignalements(auteurId));
    setChargement(false);
  }

  useActualisation(charger, auteurId);

  useEffect(() => ecouterEnvois(() => charger().catch(() => {})), [auteurId]);

  return (
    <section className="ecran">
      <div>
        <h1>Mes signalements</h1>
        <p className="ecran-sous-titre">
          {user ? "Touchez un signalement pour voir où il en est." : "Les signalements envoyés depuis ce téléphone, sans compte."}
        </p>
      </div>

      {chargement && <p className="message message-vide">Chargement...</p>}
      {!chargement && signalements.length === 0 && (
        <EtatVide icone={Camera} titre="Rien de signalé pour l'instant" texte="Un dépotoir ou un caniveau bouché près de chez vous ? Une photo suffit.">
          <Link to="/signaler" className="btn btn-signaler">
            Faire mon premier signalement
          </Link>
        </EtatVide>
      )}

      <div className="liste">
        {signalements.map((s) => {
          const rang = rangEtape(s.statut);
          const Icone = s.type === "caniveau" ? Waves : Trash2;
          if (s.statut === "attente_envoi") {
            return (
              <div key={s.id} className="element element-attente">
                <div className="element-haut">
                  <div className="tete-ecran">
                    <span className={s.type === "caniveau" ? "icone-type caniveau" : "icone-type"}>
                      <Icone size={20} />
                    </span>
                    <div>
                      <h3>{typesSignalement[s.type]}</h3>
                      <p className="element-meta">
                        {s.quartier} · {volumes[s.taille]} · {dateCourte(s.date)}
                      </p>
                    </div>
                  </div>
                  <CloudUpload size={20} />
                </div>
                <p className="element-meta">
                  {s.erreurEnvoi ? `Envoi refusé : ${s.erreurEnvoi}` : "Enregistré sur le téléphone. Il partira tout seul dès que le réseau revient."}
                </p>
                <Badge statut={s.statut} liste={statutsSignalement} />
              </div>
            );
          }
          return (
            <Link key={s.id} to={`/mes-signalements/${s.id}`} className="element">
              <div className="element-haut">
                <div className="tete-ecran">
                  <span className={s.type === "caniveau" ? "icone-type caniveau" : "icone-type"}>
                    <Icone size={20} />
                  </span>
                  <div>
                    <h3>{typesSignalement[s.type]}</h3>
                    <p className="element-meta">
                      {s.quartier} · {volumes[s.taille]} · {dateCourte(s.date)}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} />
              </div>
              {rang >= 0 && (
                <span className="progression">
                  {etapesSignalement.map((e, i) => (
                    <i key={e.statut} className={i < rang || rang === 4 ? "fait" : i === rang ? "courant" : ""}></i>
                  ))}
                </span>
              )}
              <Badge statut={s.statut} liste={statutsSignalement} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
