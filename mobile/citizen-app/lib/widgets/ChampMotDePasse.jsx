import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function ChampMotDePasse(props) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="mot-de-passe">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="mot-de-passe-oeil"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </span>
  );
}
