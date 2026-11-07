// Modello dati della "partita" (carriera di gioco).
// Il salvataggio è versionato: ogni modifica futura al modello passa da una
// migrazione Dexie con bump di SCHEMA_VERSION, come da Documento Master §4.4.

export const SCHEMA_VERSION = 1;

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
  createdAt: string;
  updatedAt: string;
}
