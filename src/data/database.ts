import Dexie, { type Table } from "dexie";
import type { Career } from "../game/types/career";
import type { Wrestler } from "../game/types/roster";

export interface Setting {
  key: string;
  value: unknown;
}

// Persistenza locale con Dexie (IndexedDB). Il Repository Pattern protegge
// i moduli di gioco dall'accesso diretto al database (Documento Master §9.2).
// Le tabelle future (championships, rivalries, shows, matches, matchResults,
// storylines, finances) entreranno con version(3)+ e migrazioni dedicate,
// mai modificando le versioni esistenti.
export class MainEventDatabase extends Dexie {
  careers!: Table<Career, string>;
  settings!: Table<Setting, string>;
  wrestlers!: Table<Wrestler, string>;

  constructor() {
    super("main-event");
    this.version(1).stores({
      careers: "saveId, createdAt, updatedAt",
      settings: "key",
    });
    this.version(2).stores({
      wrestlers: "id, saveId",
    });
  }
}

export const db = new MainEventDatabase();
