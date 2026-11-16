export default function AnneauProgression({ valeur, total, taille = 96, couleur = "#00853F", legende }) {
  const rayon = taille / 2 - 8;
  const perimetre = 2 * Math.PI * rayon;
  const part = total > 0 ? Math.min(1, valeur / total) : 0;

  return (
    <svg
      width={taille}
      height={taille}
      viewBox={`0 0 ${taille} ${taille}`}
      role="img"
      aria-label={legende || `${valeur} sur ${total}`}
      style={{ flex: "none" }}
    >
      <circle cx={taille / 2} cy={taille / 2} r={rayon} fill="none" stroke="#E9EDEA" strokeWidth="10" />
      {part > 0 && (
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          stroke={couleur}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${part * perimetre} ${perimetre}`}
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      )}
      {legende ? (
        <text x="50%" y="54%" textAnchor="middle" fontFamily="Archivo" fontWeight="800" fontSize={taille / 4.6} fill="#202B25">
          {legende}
        </text>
      ) : (
        <>
          <text x="50%" y="50%" textAnchor="middle" fontFamily="Archivo" fontWeight="800" fontSize={taille / 4} fill="#202B25">
            {valeur}
          </text>
          <text x="50%" y="68%" textAnchor="middle" fontFamily="Public Sans" fontWeight="600" fontSize="12" fill="#4F5B54">
            sur {total}
          </text>
        </>
      )}
    </svg>
  );
}
