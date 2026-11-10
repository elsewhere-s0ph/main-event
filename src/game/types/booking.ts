// Modello dati del booking (C4): card degli show, segmenti ed esiti.
// La card è ciò che il GM compone; l'esito è ciò che lo show produce.
// Stesso decoupling degli altri modelli: i tipi descrivono il dominio,
// la UI li racconta e i repository li persistono.

export type SegmentKind =
  | "promo"
  | "intervista"
  | "attacco"
  | "celebrazione"
  | "annuncio";

export type MatchType =
  | "singolo"
  | "tag"
  | "triple"
  | "fatal4"
  | "cage"
  | "ladder"
  | "hardcore";

export interface BookedMatch {
  id: string;
  /** v1: solo singoli; C6 aggiunge tag, triple threat, fatal 4-way e stipulazioni. */
  type: MatchType;
  /** Da 2 a 4 atleti secondo il tipo, tutti distinti. */
  wrestlerIds: string[];
  /** Titolo in palio: il campione in carica deve difenderlo in questo match. */
  titleId: string | null;
}

export interface BookedSegment {
  id: string;
  kind: SegmentKind;
  /** Da 1 a 3 protagonisti. */
  wrestlerIds: string[];
}

export type CardItem =
  | { kind: "match"; data: BookedMatch }
  | { kind: "segment"; data: BookedSegment };

/** Card di uno show: settimanale (showId = show.id) o evento speciale. */
export interface ShowCard {
  /** `${saveId}::${showId}`: una card per show. */
  id: string;
  saveId: string;
  showId: string;
  /** Solo per gli eventi speciali: nome e data vivono sulla card. */
  isSpecial: boolean;
  name: string | null;
  /** Data di gioco dell'evento speciale (ISO, parte data). */
  date: string | null;
  items: CardItem[];
  updatedAt: string;
}

export interface MatchOutcome {
  kind: "match";
  match: BookedMatch;
  winnerId: string;
  loserId: string;
  summary: string;
  /** Valutazione 5–99. */
  rating: number;
  seed: string;
  /** Titolo cambiato di mani in questo match, se c'era un titolo in palio. */
  titleChange: { titleId: string; newChampionId: string } | null;
  /** True se il campione in carica ha difeso con successo. */
  defense: boolean;
}

export interface SegmentOutcome {
  kind: "segment";
  segment: BookedSegment;
  text: string;
  /** Valutazione 5–99. */
  rating: number;
}

export type ShowEntryOutcome = MatchOutcome | SegmentOutcome;

/** Risultato di uno show registrato: la memoria storica della federazione. */
export interface ShowResult {
  /** `${saveId}::${showId}::${date}`: registrare due volte lo stesso show sovrascrive. */
  id: string;
  saveId: string;
  showId: string;
  showName: string;
  /** Data di gioco dello show (ISO, parte data). */
  date: string;
  isSpecial: boolean;
  outcomes: ShowEntryOutcome[];
  /** Valutazione d'insieme 5–99: i match pesano il triplo dei segmenti. */
  rating: number;
  verdict: string;
  createdAt: string;
}
