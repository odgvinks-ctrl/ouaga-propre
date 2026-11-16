import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import "../screens/Ecran.css";

export default function ConnexionRequise() {
  const { pathname } = useLocation();

  return (
    <section className="ecran">
      <div className="etat-vide connexion-requise">
        <span className="etat-vide-icone" aria-hidden="true">
          <Lock size={22} />
        </span>
        <strong>Connectez-vous pour continuer</strong>
        <p>
          Signaler un dépotoir reste possible sans compte. Pour vous abonner à la collecte, écrire aux structures et gagner des points, il faut un compte
          gratuit.
        </p>
        <div className="element-actions">
          <Link to="/connexion" state={{ depuis: pathname }} className="btn btn-primaire">
            Se connecter
          </Link>
          <Link to="/inscription" state={{ depuis: pathname }} className="btn btn-secondaire">
            Créer un compte
          </Link>
        </div>
      </div>
    </section>
  );
}
