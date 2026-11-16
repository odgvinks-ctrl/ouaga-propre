import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  ChevronRight,
  TriangleAlert,
  UserPlus,
  CalendarClock,
  Trash2,
  Truck,
  Users,
  ChartColumn,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@citoyen/providers/AuthContext.jsx";
import { useActualisation } from "@citoyen/providers/useActualisation.js";
import { getDemandesStructure } from "@citoyen/services/abonnements.js";
import { getCollectesStructure, getTournee } from "@citoyen/services/collectes.js";
import { getSignalementsStructure } from "@citoyen/services/signalements.js";
import { getStructure } from "@citoyen/services/structures.js";
import StatutReseau from "@citoyen/widgets/StatutReseau.jsx";
import { initiales } from "@citoyen/services/format.js";
import { getVehicules, getEquipes } from "../services/flotte.js";
import AnneauProgression from "../widgets/AnneauProgression.jsx";
import "@citoyen/screens/Ecran.css";
import "./Dashboard.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [structure, setStructure] = useState(null);
  const [tournee, setTournee] = useState({ points: [], faites: [] });
  const [chiffres, setChiffres] = useState({
    demandes: 0,
    aPlanifier: 0,
    alertes: 0,
    vehicules: 0,
    total: 0,
    enPanne: 0,
    equipe: 0,
  });

  async function charger() {
    const [s, demandes, collectes, signalements, vehicules, equipes, jour] = await Promise.all([
      getStructure(user.id),
      getDemandesStructure(user.id),
      getCollectesStructure(user.id),
      getSignalementsStructure(user.id),
      getVehicules(user.id),
      getEquipes(user.id),
      getTournee(user.id),
    ]);
    setStructure(s);
    setTournee(jour);
    setChiffres({
      demandes: demandes.filter((d) => d.statut === "en_attente").length,
      aPlanifier: collectes.filter((c) => c.statut === "demandee").length,
      alertes: signalements.filter((a) => a.statut === "transmis").length,
      vehicules: vehicules.filter((v) => v.statut !== "en_panne").length,
      total: vehicules.length,
      enPanne: vehicules.filter((v) => v.statut === "en_panne").length,
      equipe: equipes.length,
    });
  }

  useActualisation(charger, user.id);

  function quitter() {
    logout();
    navigate("/connexion");
  }

  const total = tournee.points.length + tournee.faites.length;
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const aujourdhui = date.charAt(0).toUpperCase() + date.slice(1);
  const secteurs = [...new Set(tournee.points.map((p) => p.quartier).filter(Boolean))];

  return (
    <section className="cockpit">
      <header className="cockpit-entete">
        <Link to="/gestion/profil" className="cockpit-logo" aria-label="Profil de la structure">
          {initiales(user.nom)}
        </Link>
        <div>
          <small>{aujourdhui}</small>
          <strong>{user.nom}</strong>
        </div>
        <StatutReseau />
        <button type="button" className="cockpit-quitter" onClick={quitter}>
          <LogOut size={18} /> Quitter
        </button>
      </header>

      <Link to="/gestion/tournee" className="cockpit-tournee">
        <AnneauProgression valeur={tournee.faites.length} total={total} taille={96} />
        <div>
          <span className="surtitre">Tournée du jour</span>
          <strong>
            {tournee.points.length === 0
              ? total === 0
                ? "Aucun passage prévu"
                : "Tournée terminée"
              : secteurs.length
                ? secteurs.join(", ")
                : `${tournee.points.length} passage(s)`}
          </strong>
          <span className="cockpit-reprendre">
            {tournee.points.length === 0 ? "Voir la tournée" : tournee.faites.length ? "Reprendre" : "Démarrer"}
            <ChevronRight size={18} />
          </span>
        </div>
      </Link>

      <div className="cockpit-corps">
        {chiffres.enPanne > 0 && (
          <Link to="/gestion/vehicules" className="message message-erreur cockpit-alerte" role="alert">
            <TriangleAlert size={20} />
            <span>
              <strong>{chiffres.enPanne} véhicule(s) en panne.</strong> Répartissez les passages sur les autres équipes.
            </span>
          </Link>
        )}
        {structure && structure.formules.length === 0 && (
          <p className="message message-attention">
            Ajoutez vos tarifs pour que les citoyens puissent s'abonner. <Link to="/gestion/profil?onglet=tarifs">Ajouter une formule</Link>
          </p>
        )}

        <p className="section-titre">À traiter</p>
        <div className="groupe">
          <Link to="/gestion/abonnements" className="groupe-ligne">
            <UserPlus size={20} />
            <span>Demandes d'abonnement</span>
            <span className={chiffres.demandes ? "compteur a-traiter" : "compteur"}>{chiffres.demandes}</span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/gestion/collectes" className="groupe-ligne">
            <CalendarClock size={20} />
            <span>Collectes à planifier</span>
            <span className={chiffres.aPlanifier ? "compteur a-traiter" : "compteur"}>{chiffres.aPlanifier}</span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/gestion/interventions" className="groupe-ligne">
            <Trash2 size={20} />
            <span>Dépotoirs transmis par la mairie</span>
            <span className={chiffres.alertes ? "compteur a-traiter" : "compteur"}>{chiffres.alertes}</span>
            <ChevronRight size={18} />
          </Link>
        </div>

        <p className="section-titre">Gestion</p>
        <div className="groupe">
          <Link to="/gestion/vehicules" className="groupe-ligne">
            <Truck size={20} />
            <span>Véhicules</span>
            <span className="element-meta">
              {chiffres.vehicules}/{chiffres.total} en service
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/gestion/equipes" className="groupe-ligne">
            <Users size={20} />
            <span>Équipes</span>
            <span className="element-meta">{chiffres.equipe} membre(s)</span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/gestion/collectes" className="groupe-ligne">
            <CalendarDays size={20} />
            <span>Planning des collectes</span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/gestion/statistiques" className="groupe-ligne">
            <ChartColumn size={20} />
            <span>Statistiques</span>
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
