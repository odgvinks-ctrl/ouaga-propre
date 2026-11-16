import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import RouteProtegee from "./components/RouteProtegee.jsx";
import Connexion from "./pages/Connexion.jsx";
import TableauDeBord from "./pages/TableauDeBord.jsx";
import CarteGlobale from "./pages/CarteGlobale.jsx";
import PointsRegroupement from "./pages/PointsRegroupement.jsx";
import Signalements from "./pages/Signalements.jsx";
import ValidationStructures from "./pages/ValidationStructures.jsx";
import Structures from "./pages/Structures.jsx";
import Utilisateurs from "./pages/Utilisateurs.jsx";
import ParametresSimulation from "./pages/ParametresSimulation.jsx";
import ComparaisonScenarios from "./pages/ComparaisonScenarios.jsx";
import Rapports from "./pages/Rapports.jsx";
import Recompenses from "./pages/Recompenses.jsx";
import NonTrouve from "./pages/NonTrouve.jsx";

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="connexion" element={<Connexion />} />
          <Route
            element={
              <RouteProtegee>
                <Layout />
              </RouteProtegee>
            }
          >
            <Route index element={<TableauDeBord />} />
            <Route path="carte" element={<CarteGlobale />} />
            <Route path="points" element={<PointsRegroupement />} />
            <Route path="signalements" element={<Signalements />} />
            <Route path="validation" element={<ValidationStructures />} />
            <Route path="structures" element={<Structures />} />
            <Route path="utilisateurs" element={<Utilisateurs />} />
            <Route path="recompenses" element={<Recompenses />} />
            <Route path="simulation" element={<ParametresSimulation />} />
            <Route path="scenarios" element={<ComparaisonScenarios />} />
            <Route path="rapports" element={<Rapports />} />
            <Route path="*" element={<NonTrouve />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
