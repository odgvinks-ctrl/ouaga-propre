import logo from "../assets/faso-neere.webp";

export default function Logo({ hauteur = 44 }) {
  return (
    <img
      src={logo}
      alt="FASO NEERE, un Faso propre, un avenir meilleur"
      height={hauteur}
      style={{ height: hauteur, width: "auto", display: "block", flex: "none" }}
    />
  );
}
