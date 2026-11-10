import { z } from "zod";
import type { WeeklyShow } from "../types/career";
import type { SegmentKind } from "../types/booking";

// Booking (C4): validazione della card e calendario degli show settimanali.
// Modulo puro: nessuna dipendenza da React, Dexie o API del browser.

export const MAX_CARD_ITEMS = 12;

export const SEGMENT_KINDS = [
  "promo",
  "intervista",
  "attacco",
  "celebrazione",
  "annuncio",
] as const;

export const SEGMENT_LABELS: Record<SegmentKind, string> = {
  promo: "Promo",
  intervista: "Intervista",
  attacco: "Attacco backstage",
  celebrazione: "Celebrazione",
  annuncio: "Annuncio",
};

const idField = z.string().min(1, "Seleziona un atleta");

export const cardItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("match"),
    data: z.object({
      id: idField,
      type: z.literal("singolo"),
      wrestlerIds: z.tuple([idField, idField]),
      titleId: idField.nullable(),
    }),
  }),
  z.object({
    kind: z.literal("segment"),
    data: z.object({
      id: idField,
      kind: z.enum(SEGMENT_KINDS),
      wrestlerIds: z
        .array(idField)
        .min(1, "Un segmento ha bisogno di almeno un protagonista")
        .max(3, "Un segmento ha al massimo 3 protagonisti"),
    }),
  }),
]);

export const cardSchema = z.object({
  showId: idField,
  isSpecial: z.boolean(),
  name: z
    .string()
    .trim()
    .min(2, "Il nome dell'evento deve avere almeno 2 caratteri")
    .max(40, "Il nome dell'evento non può superare 40 caratteri")
    .nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida")
    .nullable(),
  items: z
    .array(cardItemSchema)
    .min(1, "La card è vuota: aggiungi almeno un match o un segmento")
    .max(MAX_CARD_ITEMS, `La card può contenere al massimo ${MAX_CARD_ITEMS} segmenti`),
});

export type CardInput = z.infer<typeof cardSchema>;

export type CardValidation =
  | { ok: true; value: CardInput }
  | { ok: false; error: string };

/**
 * Valida una card completa. Oltre allo schema Zod: un atleta non può
 * combattere in due match della stessa card, e nessuno combatte contro
 * se stesso.
 */
export function validateCard(raw: unknown): CardValidation {
  const parsed = cardSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Card non valida" };
  }
  const booked: Map<string, string> = new Map();
  for (const item of parsed.data.items) {
    if (item.kind !== "match") continue;
    const [a, b] = item.data.wrestlerIds;
    if (a === b) {
      return { ok: false, error: "Un match ha bisogno di due atleti diversi" };
    }
    for (const id of item.data.wrestlerIds) {
      if (booked.has(id)) {
        return {
          ok: false,
          error: "Un atleta non può combattere in due match della stessa card",
        };
      }
      booked.set(id, item.data.id);
    }
  }
  return { ok: true, value: parsed.data };
}

export interface UpcomingShow {
  showId: string;
  name: string;
  day: number;
  /** Data di gioco della prossima puntata (ISO, parte data). */
  date: string;
}

/** Prossima data (strictamente futura) in cui va in onda lo show del giorno `day`. */
export function nextOccurrence(day: number, fromDate: string): string {
  // day 1 = lunedì … 7 = domenica; getUTCDay: 0 = domenica … 6 = sabato.
  const targetJsDay = day === 7 ? 0 : day;
  const base = new Date(`${fromDate}T00:00:00Z`);
  for (let add = 1; add <= 7; add++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + add);
    if (d.getUTCDay() === targetJsDay) return d.toISOString().slice(0, 10);
  }
  return fromDate; // irraggiungibile: day fuori range
}

/** Il prossimo show in calendario tra quelli settimanali. */
export function nextShowDate(
  shows: WeeklyShow[],
  fromDate: string
): UpcomingShow | null {
  if (shows.length === 0) return null;
  let best: UpcomingShow | null = null;
  for (const show of shows) {
    const date = nextOccurrence(show.day, fromDate);
    if (!best || date < best.date) {
      best = { showId: show.id, name: show.name, day: show.day, date };
    }
  }
  return best;
}
