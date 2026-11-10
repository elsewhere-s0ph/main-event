// Modello dati delle rivalità (C4): due atleti, una storia in fasi.
// Le fasi seguono il Documento Master §4.3: inizio → provocazione →
// escalation → conflitto → culmine → risoluzione.

export type RivalryPhase =
  | "inizio"
  | "provocazione"
  | "escalation"
  | "conflitto"
  | "culmine";

export type RivalryStatus = "attiva" | "risolta";

export interface Rivalry {
  id: string;
  saveId: string;
  /** I due avversari: [wrestlerId, wrestlerId], distinti. */
  participants: [string, string];
  /** Intensità 1–10: quanto la storia brucia. */
  intensity: number;
  phase: RivalryPhase;
  status: RivalryStatus;
  /** Data di gioco dell'inizio della storia (ISO, parte data). */
  startedOn: string;
  /** Data di gioco della chiusura; null = storia ancora aperta. */
  resolvedOn: string | null;
  /** Calore del pubblico 0–100. */
  heat: number;
  /** Cronaca breve degli episodi: le ultime righe della storia. */
  story: string[];
}
