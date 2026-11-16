import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Connexion from "./pages/Connexion.jsx";
import Accueil from "./pages/Accueil.jsx";
import Signaler from "./pages/Signaler.jsx";
import MesEnvois from "./pages/MesEnvois.jsx";
import Structures from "./pages/Structures.jsx";
import StructureDetail from "./pages/StructureDetail.jsx";
import Abonnement from "./pages/Abonnement.jsx";
import MesDemandes from "./pages/MesDemandes.jsx";
import Collecte from "./pages/Collecte.jsx";
import SimulateurOuaga from "./pages/SimulateurOuaga.jsx";
import MaTournee from "./pages/terrain/MaTournee.jsx";
import MissionsBrigade from "./pages/terrain/MissionsBrigade.jsx";
import DeclarerPanne from "./pages/terrain/DeclarerPanne.jsx";
import GestionAccueil from "./pages/gestion/Accueil.jsx";
import GestionProfil from "./pages/gestion/Profil.jsx";
import GestionZones from "./pages/gestion/Zones.jsx";
import GestionTarifs from "./pages/gestion/Tarifs.jsx";
import GestionDemandes from "./pages/gestion/Demandes.jsx";
import GestionCollectes from "./pages/gestion/Collectes.jsx";
import GestionAlertes from "./pages/gestion/Alertes.jsx";
import GestionInterventions from "./pages/gestion/Interventions.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="connexion" element={<Connexion />} />
        <Route element={<Layout />}>
          <Route index element={<Accueil />} />
          <Route path="signaler" element={<Signaler />} />
          <Route path="envois" element={<MesEnvois />} />
          <Route path="structures" element={<Structures />} />
          <Route path="structures/:id" element={<StructureDetail />} />
          <Route path="structures/:id/abonnement" element={<Abonnement />} />
          <Route path="demandes" element={<MesDemandes />} />
          <Route path="collecte" element={<Collecte />} />
          <Route path="simulateur" element={<SimulateurOuaga />} />
          <Route path="terrain/tournee" element={<MaTournee />} />
          <Route path="terrain/brigade" element={<MissionsBrigade />} />
          <Route path="terrain/panne" element={<DeclarerPanne />} />
          <Route path="gestion" element={<GestionAccueil />} />
          <Route path="gestion/profil" element={<GestionProfil />} />
          <Route path="gestion/zones" element={<GestionZones />} />
          <Route path="gestion/tarifs" element={<GestionTarifs />} />
          <Route path="gestion/demandes" element={<GestionDemandes />} />
          <Route path="gestion/collectes" element={<GestionCollectes />} />
          <Route path="gestion/alertes" element={<GestionAlertes />} />
          <Route path="gestion/interventions" element={<GestionInterventions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
