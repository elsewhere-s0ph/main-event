// Modello dati della "partita" (carriera di gioco).
// Il salvataggio è versionato: ogni modifica futura al modello passa da una
// migrazione Dexie con bump di SCHEMA_VERSION, come da Documento Master §4.4.
// v2 (C3): identità della federazione — colori, filosofia, show settimanali, logo.
// v3 (C5): economia — bilancio con storico delle transazioni (mai valori a mano).

export const SCHEMA_VERSION = 3;

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

/** Una voce del registro economico: ogni euro entra o esce con una riga. */
export interface FinanceTransaction {
  id: string;
  /** Data di gioco della transazione (ISO, parte data). */
  date: string;
  label: string;
  /** Importo in euro: positivo = incasso, negativo = spesa. */
  amount: number;
  /** Saldo dopo la transazione: lo storico racconta la storia da solo. */
  balanceAfter: number;
  kind: "incasso" | "spesa";
}

/** Economia della federazione (C5): vive sulla carriera, mai modificata a mano. */
export interface CareerFinance {
  balance: number;
  /** Ultime transazioni, la più recente prima (cap interno al repository). */
  transactions: FinanceTransaction[];
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
  /** Economia (schema 3): assente nei salvataggi pre-C5, riempita da ensureFinance. */
  finance?: CareerFinance;
  createdAt: string;
  updatedAt: string;
}
