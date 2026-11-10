import { z } from "zod";
import type { FederationColors, FederationPhilosophy, WeeklyShow } from "../types/career";

// Identità della federazione (C3): colori, filosofia di booking, show settimanali
// e logo. Modulo puro: nessuna dipendenza da React, Dexie o API del browser.

export const FEDERATION_PHILOSOPHIES = [
  "spettacolare",
  "tecnica",
  "hardcore",
  "mainstream",
  "sviluppo",
] as const;

export const PHILOSOPHY_LABELS: Record<FederationPhilosophy, string> = {
  spettacolare: "Spettacolare",
  tecnica: "Tecnica",
  hardcore: "Hardcore",
  mainstream: "Mainstream",
  sviluppo: "Sviluppo giovani",
};

/** Giorni ISO: 1 = lunedì … 7 = domenica. */
export const SHOW_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const DAY_LABELS: Record<number, string> = {
  1: "Lunedì",
  2: "Martedì",
  3: "Mercoledì",
  4: "Giovedì",
  5: "Venerdì",
  6: "Sabato",
  7: "Domenica",
};

export const MAX_SHOWS = 4;
/** Limite di sicurezza per il logo come dataURL (~150 KB di immagine). */
export const MAX_LOGO_LENGTH = 200_000;

export const DEFAULT_COLORS: FederationColors = {
  primary: "#8b5cf6",
  secondary: "#2dd4bf",
  accent: "#e879f9",
};

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Usa un colore esadecimale, per esempio #8b5cf6");

export const showInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Il nome dello show deve avere almeno 2 caratteri")
    .max(30, "Il nome dello show non può superare 30 caratteri"),
  day: z
    .number()
    .int()
    .min(1, "Giorno non valido")
    .max(7, "Giorno non valido"),
});

export const identityInputSchema = z.object({
  colors: z.object({
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
  }),
  philosophy: z.enum(FEDERATION_PHILOSOPHIES),
  shows: z
    .array(showInputSchema)
    .min(1, "Serve almeno uno show settimanale")
    .max(MAX_SHOWS, `Al massimo ${MAX_SHOWS} show settimanali`),
  logo: z.string().max(MAX_LOGO_LENGTH, "Il logo è troppo grande").nullable().optional(),
});

export type IdentityInput = z.infer<typeof identityInputSchema>;

export type IdentityResult =
  | { ok: true; value: IdentityInput }
  | { ok: false; error: string };

export function validateIdentity(raw: unknown): IdentityResult {
  const parsed = identityInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Identità non valida" };
  }
  const names = parsed.data.shows.map((s) => s.name.toLowerCase());
  if (new Set(names).size !== names.length) {
    return { ok: false, error: "Due show non possono chiamarsi allo stesso modo" };
  }
  const days = parsed.data.shows.map((s) => s.day);
  if (new Set(days).size !== days.length) {
    return { ok: false, error: "Ogni show deve andare in onda in un giorno diverso" };
  }
  return { ok: true, value: parsed.data };
}

/** Iniziali per lo stemma generato: prima lettera delle prime due parole. */
export function monogramInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const letters = words.map((w) => w[0].toUpperCase());
  if (letters.length >= 2) return letters.slice(0, 2).join("");
  const fallback = name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
  return fallback.length > 0 ? fallback : "ME";
}

export interface FederationIdentity {
  colors: FederationColors;
  philosophy: FederationPhilosophy;
  shows: WeeklyShow[];
  logo: string | null;
}

/** Identità di default: usata alla creazione e come migrazione per i salvataggi precedenti. */
export function defaultIdentity(): FederationIdentity {
  return {
    colors: { ...DEFAULT_COLORS },
    philosophy: "spettacolare",
    shows: [{ id: "show-1", name: "Show settimanale", day: 1 }],
    logo: null,
  };
}
