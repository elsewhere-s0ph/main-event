import { mulberry32, seedFromString } from "./rng";
import type { FederationPhilosophy } from "../types/career";

// Mondo & ascolti (C5, scope ridimensionato su decisione di Flynn):
// le federazioni AI esistono solo come rivali negli ascolti — nomi,
// reputazione e share di pubblico. Niente roster giocanti, niente sprite:
// il mondo vive nelle classifiche, non sul ring. Modulo puro e deterministico.

export interface AIFederation {
  id: string;
  name: string;
  philosophy: FederationPhilosophy;
  /** Reputazione 1–100: la forza di richiamo di partenza della rivale. */
  reputation: number;
  /** Colore identificativo (hex) per le classifiche. */
  color: string;
}

export interface FederationStanding {
  /** "user" per la federazione del GM, altrimenti l'id della rivale. */
  id: string;
  name: string;
  color: string;
  /** Spettatori della settimana. */
  viewers: number;
  isUser: boolean;
  /** Valutazione dell'ultimo show (solo federazione del GM). */
  rating: number | null;
}

/** La reputazione del GM è fissa in questa fase: crescerà con la progressione. */
export const USER_REPUTATION = 55;

export const USER_FEDERATION_ID = "user";

const RIVAL_POOL: ReadonlyArray<{
  name: string;
  philosophy: FederationPhilosophy;
  color: string;
}> = [
  { name: "Corona Pro Wrestling", philosophy: "mainstream", color: "#e11d48" },
  { name: "Lotta Libera Nazionale", philosophy: "tecnica", color: "#0ea5e9" },
  { name: "Circo delle Bestie", philosophy: "hardcore", color: "#f59e0b" },
  { name: "Apex Grapple League", philosophy: "spettacolare", color: "#22c55e" },
  { name: "Velvet Championship", philosophy: "mainstream", color: "#a855f7" },
  { name: "Ferro Crudo Wrestling", philosophy: "hardcore", color: "#64748b" },
];

export const RIVAL_COUNT = 4;

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Le quattro rivali della federazione: deterministiche dal seed del mondo.
 * Stesso seed → stesse rivali, stesse reputazioni.
 */
export function generateRivalFederations(seed: string): AIFederation[] {
  const rng = mulberry32(seedFromString(`world:${seed}`));
  const indices = RIVAL_POOL.map((_, i) => i);
  // Fisher-Yates parziale: 4 estratti distinti dal pool di 6.
  for (let i = 0; i < RIVAL_COUNT; i++) {
    const j = i + Math.floor(rng() * (indices.length - i));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices.slice(0, RIVAL_COUNT).map((i) => {
    const base = RIVAL_POOL[i];
    const reputation = 32 + Math.floor(rng() * 47); // 32–78
    return {
      id: `rival-${slug(base.name)}`,
      name: base.name,
      philosophy: base.philosophy,
      reputation,
      color: base.color,
    };
  });
}

/** Spettatori di uno show della federazione del GM: rating, tipo e richiamo pesano insieme. */
export function userViewers(rating: number, isSpecial: boolean, reputation: number): number {
  const base = Math.max(0, rating) * 110 * (isSpecial ? 1.75 : 1);
  const appeal = 0.85 + reputation / 400;
  return Math.max(0, Math.round(base * appeal));
}

/** Spettatori di una rivale nella settimana della data: reputazione con umore del pubblico. */
export function rivalViewers(rival: AIFederation, date: string, seed: string): number {
  const rng = mulberry32(seedFromString(`audience:${seed}:${rival.id}:${date}`));
  const mood = 0.85 + rng() * 0.3;
  return Math.max(0, Math.round(rival.reputation * 130 * mood));
}

/**
 * Classifica degli ascolti della settimana: la federazione del GM contro
 * le rivali, ordinata per spettatori.
 */
export function weeklyStandings(
  userName: string,
  userViewersCount: number,
  userRating: number | null,
  rivals: AIFederation[],
  date: string,
  seed: string
): FederationStanding[] {
  const entries: FederationStanding[] = [
    {
      id: USER_FEDERATION_ID,
      name: userName,
      color: "#8b5cf6",
      viewers: userViewersCount,
      isUser: true,
      rating: userRating,
    },
    ...rivals.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      viewers: rivalViewers(r, date, seed),
      isUser: false,
      rating: null,
    })),
  ];
  return entries.sort((a, b) => b.viewers - a.viewers);
}

/** Quota di mercato della federazione (0–100). */
export function shareOf(standings: FederationStanding[], federationId: string): number {
  const total = standings.reduce((sum, s) => sum + s.viewers, 0);
  if (total <= 0) return 0;
  const mine = standings.find((s) => s.id === federationId);
  if (!mine) return 0;
  return Math.round((mine.viewers / total) * 100);
}
