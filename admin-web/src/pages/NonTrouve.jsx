import { Link } from "react-router-dom";

export default function NonTrouve() {
  return (
    <section className="page">
      <div className="page-entete">
        <div>
          <h1>Page introuvable</h1>
          <p className="page-sous-titre">Cette adresse ne correspond à aucune page de l'administration.</p>
        </div>
      </div>
      <Link to="/" className="btn btn-primaire" style={{ alignSelf: "flex-start" }}>
        Retour au tableau de bord
      </Link>
    </section>
  );
}
