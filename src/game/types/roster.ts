import type { BodyType, WrestlerDef } from "./match";

// Modello dati del wrestler "gestionale" (C3). È separato dal WrestlerDef
// del motore di incontro: qui vive tutto ciò che serve alla carriera
// (contratto, gimmick, carisma), mentre il motore consuma solo la sua
// proiezione toWrestlerDef — stesso decoupling motore/dati del §2.

export type Alignment = "face" | "heel";

/** Attributi 1–10, come quelli che il motore già consuma, più il carisma. */
export interface WrestlerStats {
  /** Forza: mosse di potenza e danno base (1–10). */
  power: number;
  /** Agilità: colpi rapidi e caduta dei pesi (1–10). */
  agility: number;
  /** Resistenza: recupero di energia (1–10). */
  stamina: number;
  /** Carisma: risposta del pubblico e valore per il booking (1–10). */
  charisma: number;
}

export interface WrestlerContract {
  /** Stipendio settimanale in game-cash. */
  weeklyPay: number;
  /** Data di gioco della firma (ISO, parte data). */
  signedOn: string;
  /** Data di gioco della scadenza (ISO, parte data). */
  expiresOn: string;
}

export interface Wrestler {
  id: string;
  /** Salvataggio (federazione) di appartenenza. */
  saveId: string;
  name: string;
  nickname: string;
  /** Descrizione della gimmick in una riga. */
  gimmick: string;
  bodyType: BodyType;
  alignment: Alignment;
  stats: WrestlerStats;
  signature: string;
  finisher: string;
  colors: { trim: string; skin: string };
  contract: WrestlerContract;
}

/** Proiezione del wrestler verso il motore d'incontro (C2). */
export function toWrestlerDef(w: Wrestler): WrestlerDef {
  return {
    id: w.id,
    name: w.name,
    nickname: w.nickname,
    bodyType: w.bodyType,
    finisher: w.finisher,
    colors: w.colors,
    stats: {
      power: w.stats.power,
      agility: w.stats.agility,
      stamina: w.stats.stamina,
    },
  };
}
