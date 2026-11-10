// Modello dati della "partita" (carriera di gioco).
// Il salvataggio è versionato: ogni modifica futura al modello passa da una
// migrazione Dexie con bump di SCHEMA_VERSION, come da Documento Master §4.4.
// v2 (C3): identità della federazione — colori, filosofia, show settimanali, logo.

export const SCHEMA_VERSION = 2;

export type FederationPhilosophy =
  | "spettacolare"
  | "tecnica"
  | "hardcore"
  | "mainstream"
  | "sviluppo";

export interface WeeklyShow {
  id: string;
  name: string;
  /** Giorno della settimana: 1 = lunedì … 7 = domenica. */
  day: number;
}

export interface FederationColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface Career {
  saveId: string;
  schemaVersion: number;
  gameVersion: string;
  federationName: string;
  gmName: string;
  /** Seed del mondo: visibile e condivisibile, generato se non fornito. */
  seed: string;
  /** Data corrente del mondo di gioco (ISO, parte data). */
  inGameDate: string;
  /** Identità della federazione (schema 2): assente nei salvataggi pre-C3, riempita da ensureIdentity. */
  colors?: FederationColors;
  philosophy?: FederationPhilosophy;
  shows?: WeeklyShow[];
  /** Logo caricato dall'utente (dataURL) o null = stemma generato dalle iniziali. */
  logo?: string | null;
  createdAt: string;
  updatedAt: string;
}
