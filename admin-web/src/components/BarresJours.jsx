export default function BarresJours({ jours, cle, couleur = "#00853F", hauteur = 140, legende }) {
  const largeur = 420;
  const maximum = Math.max(1, ...jours.map((j) => j[cle]));
  const pas = largeur / jours.length;
  const barre = pas * 0.56;

  return (
    <svg width="100%" viewBox={`0 0 ${largeur} ${hauteur + 26}`} role="img" aria-label={legende} style={{ maxHeight: 220 }}>
      <line x1="0" y1={hauteur} x2={largeur} y2={hauteur} stroke="#DCE2DE" />
      {jours.map((j, i) => {
        const h = (j[cle] / maximum) * (hauteur - 22);
        const x = i * pas + (pas - barre) / 2;
        const dernier = i === jours.length - 1;
        return (
          <g key={j.date.toISOString()}>
            <rect x={x} y={hauteur - Math.max(h, 2)} width={barre} height={Math.max(h, 2)} rx="4" fill={dernier ? couleur : "#B8DCC8"}>
              <title>
                {j.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} : {j[cle]}
              </title>
            </rect>
            <text x={x + barre / 2} y={hauteur - Math.max(h, 2) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#202B25">
              {j[cle]}
            </text>
            <text x={x + barre / 2} y={hauteur + 18} textAnchor="middle" fontSize="12" fill="#4F5B54">
              {j.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
