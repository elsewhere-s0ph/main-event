import Dexie, { type Table } from "dexie";
import type { Career } from "../game/types/career";

export interface Setting {
  key: string;
  value: unknown;
}

// Persistenza locale con Dexie (IndexedDB). Il Repository Pattern protegge
// i moduli di gioco dall'accesso diretto al database (Documento Master §9.2).
// Le tabelle future (wrestlers, federations, contracts, championships,
// rivalries, shows, matches, matchResults, storylines, finances) entreranno
// con version(2)+ e migrazioni dedicate, mai modificando la version(1).
export class MainEventDatabase extends Dexie {
  careers!: Table<Career, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super("main-event");
    this.version(1).stores({
      careers: "saveId, createdAt, updatedAt",
      settings: "key",
    });
  }
}

export const db = new MainEventDatabase();
