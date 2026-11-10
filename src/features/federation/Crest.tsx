import { monogramInitials } from "../../game/core/federation";
import type { FederationColors } from "../../game/types/career";

interface CrestProps {
  name: string;
  colors: FederationColors;
  logo: string | null;
  size?: number;
}

/** Stemma della federazione: logo caricato dall'utente, altrimenti monogramma generato. */
export default function Crest({ name, colors, logo, size = 64 }: CrestProps) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={`Logo ${name}`}
        width={size}
        height={size}
        style={{ borderRadius: 12, objectFit: "cover", display: "block" }}
      />
    );
  }
  const initials = monogramInitials(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Stemma ${name}`}
      style={{ display: "block" }}
    >
      <path
        d="M32 3 58 11v20c0 15-11 25-26 30C17 56 6 46 6 31V11Z"
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth="3"
      />
      <path
        d="M32 10 51 16v15c0 11-8 19-19 23-11-4-19-12-19-23V16Z"
        fill={colors.accent}
        opacity="0.2"
      />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="system-ui, sans-serif"
      >
        {initials}
      </text>
      <circle cx="32" cy="14" r="2.5" fill={colors.accent} />
    </svg>
  );
}
