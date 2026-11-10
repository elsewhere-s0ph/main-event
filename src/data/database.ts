import Dexie, { type Table } from "dexie";
import type { Career } from "../game/types/career";
import type { Wrestler } from "../game/types/roster";
import type { Championship } from "../game/types/titles";
import type { Rivalry } from "../game/types/rivalry";
import type { ShowCard, ShowResult } from "../game/types/booking";

export interface Setting {
  key: string;
  value: unknown;
}

// Persistenza locale con Dexie (IndexedDB). Il Repository Pattern protegge
// i moduli di gioco dall'accesso diretto al database (Documento Master §9.2).
// Le tabelle future (matches, matchResults, storylines, finances) entreranno
// con version(5)+ e migrazioni dedicate, mai modificando le versioni esistenti.
export class MainEventDatabase extends Dexie {
  careers!: Table<Career, string>;
  settings!: Table<Setting, string>;
  wrestlers!: Table<Wrestler, string>;
  championships!: Table<Championship, string>;
  rivalries!: Table<Rivalry, string>;
  showCards!: Table<ShowCard, string>;
  showResults!: Table<ShowResult, string>;

  constructor() {
    super("main-event");
    this.version(1).stores({
      careers: "saveId, createdAt, updatedAt",
      settings: "key",
    });
    this.version(2).stores({
      wrestlers: "id, saveId",
    });
    this.version(3).stores({
      championships: "id, saveId",
    });
    // v4 (C4): booking e show — rivalità, card salvate e risultati registrati.
    this.version(4).stores({
      rivalries: "id, saveId",
      showCards: "id, saveId",
      showResults: "id, saveId, date",
    });
  }
}

export const db = new MainEventDatabase();
