import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, MapPin, Tag, Wrench, ChevronRight } from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getDemandesStructure } from "@citoyen/services/abonnements.js";
import { getCollectesStructure } from "@citoyen/services/collectes.js";
import { getSignalementsStructure } from "@citoyen/services/signalements.js";
import { getStructure } from "@citoyen/services/structures.js";
import "@citoyen/screens/Ecran.css";

export default function Accueil() {
  const { user } = useAuth();
  const [structure, setStructure] = useState(null);
  const [chiffres, setChiffres] = useState({ demandes: 0, abonnes: 0, collectes: 0, alertes: 0 });

  async function charger() {
    const [s, demandes, collectes, signalements] = await Promise.all([
      getStructure(user.id),
      getDemandesStructure(user.id),
      getCollectesStructure(user.id),
      getSignalementsStructure(user.id),
    ]);
    setStructure(s);
    setChiffres({
      demandes: demandes.filter((d) => d.statut === "en_attente").length,
      abonnes: demandes.filter((d) => d.statut === "accepte").length,
      collectes: collectes.filter((c) => c.statut === "demandee" || c.statut === "planifiee").length,
      alertes: signalements.filter((a) => a.statut === "transmis").length,
    });
  }

  useActualisation(charger, user.id);

  return (
    <section className="ecran">
      <div>
        <h1>{user.nom}</h1>
        <p className="ecran-sous-titre">
          <ShieldCheck size={16} /> Compte vérifié par l'administration
        </p>
      </div>

      {structure && structure.formules.length === 0 && (
        <p className="message message-attention">
          Ajoutez vos tarifs pour que les citoyens puissent s'abonner. <Link to="/gestion/tarifs">Ajouter une formule</Link>
        </p>
      )}

      <div className="stats">
        <Link to="/gestion/demandes" className="stat">
          <strong>{chiffres.demandes}</strong>
          <span>Demandes à traiter</span>
        </Link>
        <Link to="/gestion/collectes" className="stat">
          <strong>{chiffres.collectes}</strong>
          <span>Collectes à faire</span>
        </Link>
        <Link to="/gestion/alertes" className="stat">
          <strong>{chiffres.alertes}</strong>
          <span>Alertes du secteur</span>
        </Link>
        <div className="stat">
          <strong>{chiffres.abonnes}</strong>
          <span>Abonnés</span>
        </div>
      </div>

      <p className="section-titre">Ma structure</p>
      <div className="liste">
        <Link to="/gestion/zones" className="element">
          <div className="element-haut">
            <h3>
              <MapPin size={18} /> Secteurs d'intervention
            </h3>
            <ChevronRight size={20} />
          </div>
          {structure && <p className="element-meta">{structure.quartiers.join(", ")}</p>}
        </Link>
        <Link to="/gestion/tarifs" className="element">
          <div className="element-haut">
            <h3>
              <Tag size={18} /> Tarifs et fréquences
            </h3>
            <ChevronRight size={20} />
          </div>
          {structure && <p className="element-meta">{structure.formules.length} formule(s)</p>}
        </Link>
        <Link to="/gestion/interventions" className="element">
          <div className="element-haut">
            <h3>
              <Wrench size={18} /> Suivi des interventions
            </h3>
            <ChevronRight size={20} />
          </div>
        </Link>
      </div>
    </section>
  );
}
