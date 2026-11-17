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
  /** Chi esegue l'azione (indice tra i partecipanti; 0–1 nei match 1v1). */
  actor: number;
  /** Chi subisce l'azione, nei match a più atleti (dove pertinente). */
  target?: number;
  /** Nome della mossa per la cronaca ("" se non pertinente). */
  moveName: string;
  damage: number;
  /** Righe di cronaca in italiano. */
  text: string;
  /** Id della mossa eseguita, se presente (per le coreografie dedicate). */
  moveId?: string;
  /** Istante dell'impatto dentro l'evento, in ms (default 0: testo a inizio evento). */
  impactMs?: number;
  /** Energia di tutti i partecipanti al termine dell'evento (0–100). */
  energyAfter: readonly number[];
}

export interface MatchResult {
  seed: string;
  wrestlers: readonly WrestlerDef[];
  winner: number;
  /** Chi perde, nei match a più atleti (nei 1v1 è l'altro lato). */
  loser?: number;
  events: readonly MatchEvent[];
  durationMs: number;
  finalEnergy: readonly number[];
  summary: string;
}
