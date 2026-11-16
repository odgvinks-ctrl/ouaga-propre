import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./providers/AuthContext.jsx";
import Layout from "./widgets/Layout.jsx";
import RouteProtegee from "./widgets/RouteProtegee.jsx";
import Connexion from "./screens/Connexion.jsx";
import Inscription from "./screens/Inscription.jsx";
import EnAttente from "./screens/EnAttente.jsx";
import Accueil from "./screens/Accueil.jsx";
import Signaler from "./screens/Signaler.jsx";
import MesEnvois from "./screens/MesEnvois.jsx";
import Structures from "./screens/Structures.jsx";
import StructureDetail from "./screens/StructureDetail.jsx";
import Abonnement from "./screens/Abonnement.jsx";
import MesDemandes from "./screens/MesDemandes.jsx";
import Collecte from "./screens/Collecte.jsx";
import MaTournee from "@collecteur/screens/terrain/MaTournee.jsx";
import MissionsBrigade from "@collecteur/screens/terrain/MissionsBrigade.jsx";
import DeclarerPanne from "@collecteur/screens/terrain/DeclarerPanne.jsx";
import GestionAccueil from "@collecteur/screens/Accueil.jsx";
import GestionProfil from "@collecteur/screens/Profil.jsx";
import GestionZones from "@collecteur/screens/Zones.jsx";
import GestionTarifs from "@collecteur/screens/Tarifs.jsx";
import GestionDemandes from "@collecteur/screens/Demandes.jsx";
import GestionCollectes from "@collecteur/screens/Collectes.jsx";
import GestionAlertes from "@collecteur/screens/Alertes.jsx";
import GestionInterventions from "@collecteur/screens/Interventions.jsx";

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
          <Route path="en-attente" element={<EnAttente />} />
          <Route
            element={
              <RouteProtegee>
                <Layout />
              </RouteProtegee>
            }
          >
            <Route index element={<Depart />} />
            <Route path="signaler" element={<Citoyen><Signaler /></Citoyen>} />
            <Route path="envois" element={<Citoyen><MesEnvois /></Citoyen>} />
            <Route path="structures" element={<Citoyen><Structures /></Citoyen>} />
            <Route path="structures/:id" element={<Citoyen><StructureDetail /></Citoyen>} />
            <Route path="structures/:id/abonnement" element={<Citoyen><Abonnement /></Citoyen>} />
            <Route path="demandes" element={<Citoyen><MesDemandes /></Citoyen>} />
            <Route path="collecte" element={<Citoyen><Collecte /></Citoyen>} />
            <Route path="terrain/tournee" element={<MaTournee />} />
            <Route path="terrain/brigade" element={<MissionsBrigade />} />
            <Route path="terrain/panne" element={<DeclarerPanne />} />
            <Route path="gestion" element={<Structure><GestionAccueil /></Structure>} />
            <Route path="gestion/profil" element={<Structure><GestionProfil /></Structure>} />
            <Route path="gestion/zones" element={<Structure><GestionZones /></Structure>} />
            <Route path="gestion/tarifs" element={<Structure><GestionTarifs /></Structure>} />
            <Route path="gestion/demandes" element={<Structure><GestionDemandes /></Structure>} />
            <Route path="gestion/collectes" element={<Structure><GestionCollectes /></Structure>} />
            <Route path="gestion/alertes" element={<Structure><GestionAlertes /></Structure>} />
            <Route path="gestion/interventions" element={<Structure><GestionInterventions /></Structure>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
