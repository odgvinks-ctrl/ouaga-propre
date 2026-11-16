import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Connexion from "./pages/Connexion.jsx";
import Accueil from "./pages/Accueil.jsx";
import Signaler from "./pages/Signaler.jsx";
import MesEnvois from "./pages/MesEnvois.jsx";
import Abonnement from "./pages/Abonnement.jsx";
import Collecte from "./pages/Collecte.jsx";
import SimulateurOuaga from "./pages/SimulateurOuaga.jsx";
import MaTournee from "./pages/terrain/MaTournee.jsx";
import MissionsBrigade from "./pages/terrain/MissionsBrigade.jsx";
import DeclarerPanne from "./pages/terrain/DeclarerPanne.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="connexion" element={<Connexion />} />
        <Route element={<Layout />}>
          <Route index element={<Accueil />} />
          <Route path="signaler" element={<Signaler />} />
          <Route path="envois" element={<MesEnvois />} />
          <Route path="abonnement" element={<Abonnement />} />
          <Route path="collecte" element={<Collecte />} />
          <Route path="simulateur" element={<SimulateurOuaga />} />
          <Route path="terrain/tournee" element={<MaTournee />} />
          <Route path="terrain/brigade" element={<MissionsBrigade />} />
          <Route path="terrain/panne" element={<DeclarerPanne />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
