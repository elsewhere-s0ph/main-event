// Tipi del motore di incontro (C2). Il motore è puro e deterministico:
// stesso seed → stesso incontro, come da Documento Master §5.2.

export type Side = 0 | 1;

export type BodyType = "cruiserweight" | "heavyweight";

export interface WrestlerStats {
  /** Forza: mosse di potenza e danno base (1–10). */
  power: number;
  /** Agilità: colpi rapidi e caduta dei pesi (1–10). */
  agility: number;
  /** Resistenza: recupero di energia (1–10). */
  stamina: number;
}

export interface WrestlerDef {
  id: string;
  name: string;
  nickname: string;
  bodyType: BodyType;
  finisher: string;
  colors: { trim: string; skin: string };
  stats: WrestlerStats;
  /** Testa rasata: nessuna chioma disegnata. */
  bald?: boolean;
  /** Tatuaggio caratteristico: "skull" = manica di teschi. */
  tattoo?: string;
}

export type EventKind =
  | "entrance"
  | "approach"
  | "lockup"
  | "strike"
  | "grapple"
  | "knockdown"
  | "getup"
  | "finisher"
  | "pin"
  | "kickout"
  | "win";

export interface MatchEvent {
  id: number;
  /** Inizio dell'evento, in ms dall'inizio dell'incontro. */
  t: number;
  /** Durata dell'animazione, in ms. */
  durMs: number;
  kind: EventKind;
  /** Chi esegue l'azione. */
  actor: Side;
  /** Nome della mossa per la cronaca ("" se non pertinente). */
  moveName: string;
  damage: number;
  /** Righe di cronaca in italiano. */
  text: string;
  /** Energia di entrambi al termine dell'evento (0–100). */
  energyAfter: readonly [number, number];
}

export interface MatchResult {
  seed: string;
  wrestlers: readonly [WrestlerDef, WrestlerDef];
  winner: Side;
  events: readonly MatchEvent[];
  durationMs: number;
  finalEnergy: readonly [number, number];
  summary: string;
}
