import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Connexion from "./pages/Connexion.jsx";
import TableauDeBord from "./pages/TableauDeBord.jsx";
import CarteOperationnelle from "./pages/CarteOperationnelle.jsx";
import Moderation from "./pages/Moderation.jsx";
import PlanGestion from "./pages/PlanGestion.jsx";
import SimulateurOuaga from "./pages/SimulateurOuaga.jsx";
import Abonnements from "./pages/Abonnements.jsx";
import Collectes from "./pages/Collectes.jsx";
import Interventions from "./pages/Interventions.jsx";
import Ressources from "./pages/Ressources.jsx";
import Utilisateurs from "./pages/Utilisateurs.jsx";
import Rapports from "./pages/Rapports.jsx";
import NonTrouve from "./pages/NonTrouve.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="connexion" element={<Connexion />} />
        <Route element={<Layout />}>
          <Route index element={<TableauDeBord />} />
          <Route path="carte" element={<CarteOperationnelle />} />
          <Route path="signalements" element={<Moderation />} />
          <Route path="plan" element={<PlanGestion />} />
          <Route path="simulateur" element={<SimulateurOuaga />} />
          <Route path="abonnements" element={<Abonnements />} />
          <Route path="collectes" element={<Collectes />} />
          <Route path="interventions" element={<Interventions />} />
          <Route path="ressources" element={<Ressources />} />
          <Route path="utilisateurs" element={<Utilisateurs />} />
          <Route path="rapports" element={<Rapports />} />
          <Route path="*" element={<NonTrouve />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
