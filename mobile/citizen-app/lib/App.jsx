import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./providers/AuthContext.jsx";
import Layout from "./widgets/Layout.jsx";
import RouteProtegee from "./widgets/RouteProtegee.jsx";
import Connexion from "./screens/Connexion.jsx";
import Inscription from "./screens/Inscription.jsx";
import Validation from "./screens/Validation.jsx";
import Accueil from "./screens/Accueil.jsx";
import CarteDepotoirs from "./screens/CarteDepotoirs.jsx";
import CreerSignalement from "./screens/CreerSignalement.jsx";
import MesSignalements from "./screens/MesSignalements.jsx";
import SignalementEnvoye from "./screens/SignalementEnvoye.jsx";
import SuiviSignalement from "./screens/SuiviSignalement.jsx";
import Recompenses from "./screens/Recompenses.jsx";
import Structures from "./screens/Structures.jsx";
import StructureDetail from "./screens/StructureDetail.jsx";
import DemandeAbonnement from "./screens/DemandeAbonnement.jsx";
import DemandeCollecte from "./screens/DemandeCollecte.jsx";
import Messagerie from "./screens/Messagerie.jsx";
import Profil from "./screens/Profil.jsx";
import Dashboard from "@collecteur/screens/Dashboard.jsx";
import DemandesAbonnements from "@collecteur/screens/DemandesAbonnements.jsx";
import DemandesCollecte from "@collecteur/screens/DemandesCollecte.jsx";
import Interventions from "@collecteur/screens/Interventions.jsx";
import MessagerieStructure from "@collecteur/screens/Messagerie.jsx";
import Vehicules from "@collecteur/screens/Vehicules.jsx";
import Equipes from "@collecteur/screens/Equipes.jsx";
import ProfilStructure from "@collecteur/screens/Profil.jsx";
import Statistiques from "@collecteur/screens/Statistiques.jsx";
import Tournee from "@collecteur/screens/Tournee.jsx";

function Depart() {
  const { user } = useAuth();
  return user.role === "structure" ? <Navigate to="/gestion" replace /> : <Accueil />;
}

function Citoyen({ children }) {
  return <RouteProtegee roles={["citoyen"]}>{children}</RouteProtegee>;
}

function Structure({ children }) {
  return <RouteProtegee roles={["structure"]}>{children}</RouteProtegee>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="connexion" element={<Connexion />} />
          <Route path="inscription" element={<Inscription />} />
          <Route path="validation" element={<Validation />} />
          <Route
            element={
              <RouteProtegee>
                <Layout />
              </RouteProtegee>
            }
          >
            <Route index element={<Depart />} />
            <Route path="carte" element={<Citoyen><CarteDepotoirs /></Citoyen>} />
            <Route path="signaler" element={<Citoyen><CreerSignalement /></Citoyen>} />
            <Route path="signaler/envoye" element={<Citoyen><SignalementEnvoye /></Citoyen>} />
            <Route path="mes-signalements" element={<Citoyen><MesSignalements /></Citoyen>} />
            <Route path="mes-signalements/:id" element={<Citoyen><SuiviSignalement /></Citoyen>} />
            <Route path="structures" element={<Citoyen><Structures /></Citoyen>} />
            <Route path="structures/:id" element={<Citoyen><StructureDetail /></Citoyen>} />
            <Route path="structures/:id/abonnement" element={<Citoyen><DemandeAbonnement /></Citoyen>} />
            <Route path="collecte" element={<Citoyen><DemandeCollecte /></Citoyen>} />
            <Route path="messagerie" element={<Citoyen><Messagerie /></Citoyen>} />
            <Route path="messagerie/:id" element={<Citoyen><Messagerie /></Citoyen>} />
            <Route path="profil" element={<Citoyen><Profil /></Citoyen>} />
            <Route path="recompenses" element={<Citoyen><Recompenses /></Citoyen>} />
            <Route path="gestion" element={<Structure><Dashboard /></Structure>} />
            <Route path="gestion/abonnements" element={<Structure><DemandesAbonnements /></Structure>} />
            <Route path="gestion/collectes" element={<Structure><DemandesCollecte /></Structure>} />
            <Route path="gestion/tournee" element={<Structure><Tournee /></Structure>} />
            <Route path="gestion/interventions" element={<Structure><Interventions /></Structure>} />
            <Route path="gestion/messagerie" element={<Structure><MessagerieStructure /></Structure>} />
            <Route path="gestion/messagerie/:id" element={<Structure><MessagerieStructure /></Structure>} />
            <Route path="gestion/vehicules" element={<Structure><Vehicules /></Structure>} />
            <Route path="gestion/equipes" element={<Structure><Equipes /></Structure>} />
            <Route path="gestion/profil" element={<Structure><ProfilStructure /></Structure>} />
            <Route path="gestion/statistiques" element={<Structure><Statistiques /></Structure>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
