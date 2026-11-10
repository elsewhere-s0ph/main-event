import type { Championship, Reign } from "../types/titles";
import type { Wrestler } from "../types/roster";

// Titoli (C3): incoronazione, vacanza e misura dei regni. Funzioni pure e
// deterministiche: le regole vivono qui, non nella UI (stesso approccio
// dei contratti).

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string): number {
  return Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  );
}

/** Giorni di regno alla data di gioco (minimo 1: il giorno dell'incoronazione). */
export function reignDays(reign: Reign, today: string): number {
  const end = reign.lostOn ?? today;
  return Math.max(1, daysBetween(reign.wonOn, end) + 1);
}

/** Il regno in corso, se il titolo non è vacante. */
export function currentReign(championship: Championship): Reign | null {
  if (!championship.currentChampionId) return null;
  const reign = championship.reigns[championship.reigns.length - 1];
  return reign && reign.lostOn === null ? reign : null;
}

/** I titoli di categoria sono riservati: i pesi leggeri restano tra di loro. */
export function isEligible(championship: Championship, wrestler: Wrestler): boolean {
  if (championship.category === "cruiserweight") {
    return wrestler.bodyType === "cruiserweight";
  }
  return true;
}

/**
 * Incorona un nuovo campione: chiude il regno in corso (se di un altro)
 * e apre il suo, con il nome congelato nell'albo d'oro.
 */
export function crownChampion(
  championship: Championship,
  wrestler: Wrestler,
  today: string
): Championship {
  const open = currentReign(championship);
  if (open && open.championId === wrestler.id) return championship;
  const reigns = open
    ? championship.reigns.map((r, i) =>
        i === championship.reigns.length - 1 ? { ...r, lostOn: today } : r
      )
    : championship.reigns;
  return {
    ...championship,
    currentChampionId: wrestler.id,
    reigns: [
      ...reigns,
      {
        championId: wrestler.id,
        championName: wrestler.name,
        wonOn: today,
        lostOn: null,
        defenses: 0,
      },
    ],
  };
}

/** Rende vacante il titolo: il regno finisce oggi e resta nell'albo d'oro. */
export function vacateTitle(championship: Championship, today: string): Championship {
  const open = currentReign(championship);
  if (!open) return championship;
  return {
    ...championship,
    currentChampionId: null,
    reigns: championship.reigns.map((r, i) =>
      i === championship.reigns.length - 1 ? { ...r, lostOn: today } : r
    ),
  };
}
