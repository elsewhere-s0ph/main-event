// Modello dati dei titoli (C3). Ogni federazione ha il suo set di titoli
// (Documento Master §4.3: numero libero); lo storico dei regni è l'albo d'oro.

export type ChampionshipCategory = "world" | "secondary" | "cruiserweight";

/** Un regno: dalla conquista alla perdita (o a oggi, se in corso). */
export interface Reign {
  championId: string;
  /** Nome al momento della conquista: l'albo d'oro non cambia se il wrestler viene rinominato. */
  championName: string;
  /** Data di gioco della conquista (ISO, parte data). */
  wonOn: string;
  /** Data di gioco della perdita; null = regno in corso. */
  lostOn: string | null;
  /** Difese del titolo: resta 0 finché il booking (C4) non introduce i match. */
  defenses: number;
}

export interface Championship {
  id: string;
  /** Salvataggio (federazione) di appartenenza. */
  saveId: string;
  name: string;
  category: ChampionshipCategory;
  /** Prestigio 1–10: quanto il titolo vale per il pubblico. */
  prestige: number;
  /** null = titolo vacante. */
  currentChampionId: string | null;
  /** Storico completo dei regni, in ordine cronologico. */
  reigns: Reign[];
  createdAt: string;
}
