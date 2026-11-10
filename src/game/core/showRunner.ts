import { mulberry32, seedFromString } from "./rng";
import { simulateMatch } from "../engine/matchEngine";
import { toWrestlerDef } from "../types/roster";
import { crownChampion } from "./titles";
import { advanceRivalry, resolveRivalry } from "./rivalry";
import type { Wrestler } from "../types/roster";
import type { Championship } from "../types/titles";
import type { Rivalry } from "../types/rivalry";
import type {
  CardItem,
  MatchOutcome,
  SegmentKind,
  SegmentOutcome,
  ShowEntryOutcome,
  ShowResult,
} from "../types/booking";

// Registra uno show (C4): match simulati col motore deterministico, segmenti
// con esiti di cronaca, rivalità che avanzano, titoli che si difendono.
// Tutto puro e deterministico: stesso input → stesso show (Documento Master §5.2).

export interface RunShowInput {
  items: CardItem[];
  roster: Wrestler[];
  titles: Championship[];
  rivalries: Rivalry[];
  saveId: string;
  showId: string;
  showName: string;
  /** Data di gioco dello show (ISO, parte data). */
  date: string;
  seed: string;
  isSpecial: boolean;
}

export interface RunShowOutput {
  result: ShowResult;
  /** Titoli toccati dallo show: difese riuscite o cambi di titolo. */
  titles: Championship[];
  /** Rivalità aggiornate (anche quelle solo scaldate). */
  rivalries: Rivalry[];
}

const SEGMENT_BONUS: Record<SegmentKind, number> = {
  promo: 6,
  intervista: 4,
  attacco: 8,
  celebrazione: 5,
  annuncio: 2,
};

const SEGMENT_LINES: Record<SegmentKind, readonly string[]> = {
  promo: [
    "{who} prende il microfono: la promo accende la platea.",
    "Promo incendiaria di {who}: il pubblico non si siede più.",
  ],
  intervista: [
    "A bordo ring, {who} risponde secco: le parole pesano più delle mosse.",
    "{who} all’intervista: poche parole, tanti nemici.",
  ],
  attacco: [
    "{who} colpisce alle spalle: backstage in subbuglio.",
    "Agguato backstage: {who} lascia il segno.",
  ],
  celebrazione: [
    "{who} festeggia con il pubblico: bandiere e champagne.",
    "La platea canta con {who}: serata da ricordare.",
  ],
  annuncio: [
    "Annuncio ufficiale: {who} ha qualcosa da dire, e lo dice forte.",
    "{who} svela i piani della federazione: la platea rugge.",
  ],
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function matchSeedFor(seed: string, date: string, showId: string, matchId: string): string {
  return `show:${seed}:${date}:${showId}:${matchId}`;
}

function segmentSeedFor(seed: string, date: string, showId: string, segmentId: string): string {
  return `segment:${seed}:${date}:${showId}:${segmentId}`;
}

/** Valutazione di un match: equilibrio, carisma, titolo e rivalità pesano insieme. */
export function matchRating(
  a: Wrestler,
  b: Wrestler,
  opts: { titlePrestige: number; rivalryIntensity: number }
): number {
  const charisma = (a.stats.charisma + b.stats.charisma) / 2;
  const gap =
    Math.abs(a.stats.power - b.stats.power) +
    Math.abs(a.stats.agility - b.stats.agility) +
    Math.abs(a.stats.stamina - b.stats.stamina);
  const balance = Math.max(0, 10 - gap * 1.5);
  const raw =
    42 + charisma * 3.4 + balance + opts.titlePrestige * 0.8 + opts.rivalryIntensity * 1.6;
  return Math.round(clamp(raw, 5, 99));
}

function segmentRating(kind: SegmentKind, pros: Wrestler[], rng: () => number): number {
  const charisma =
    pros.reduce((sum, w) => sum + w.stats.charisma, 0) / Math.max(1, pros.length);
  const raw = 34 + charisma * 4.4 + SEGMENT_BONUS[kind] + rng() * 10;
  return Math.round(clamp(raw, 5, 99));
}

function segmentText(kind: SegmentKind, names: string[], rng: () => number): string {
  const who = names.join(" e ");
  const lines = SEGMENT_LINES[kind];
  const line = lines[Math.floor(rng() * lines.length)] ?? lines[0];
  return line.replace("{who}", who);
}

/** Verdetto sintetico sullo show, in base alla valutazione d'insieme. */
export function showVerdict(rating: number): string {
  if (rating >= 85) return "Notte leggendaria: il pubblico non tornerà più a casa lo stesso.";
  if (rating >= 70) return "Grande show: la federazione cresce, e si sente.";
  if (rating >= 55) return "Show solido: qualcosa da limare, molto da vendere.";
  if (rating >= 40) return "Serata passabile: il pubblico resta educato, e poco altro.";
  return "Serata fiacca: meglio non parlarne, domani si torna in palestra.";
}

/** Controlli prima di registrare: roster e titoli citati dalla card devono esistere. */
export function runnableIssues(
  items: CardItem[],
  roster: Wrestler[],
  titles: Championship[]
): string[] {
  const issues: string[] = [];
  const byId = new Set(roster.map((w) => w.id));
  const titleById = new Map(titles.map((t) => [t.id, t] as const));
  for (const item of items) {
    if (item.kind === "match") {
      for (const id of item.data.wrestlerIds) {
        if (!byId.has(id)) issues.push("Un atleta della card non è più nel roster");
      }
      if (item.data.titleId) {
        const title = titleById.get(item.data.titleId);
        if (!title) {
          issues.push("Il titolo in palio non esiste più");
        } else if (
          !title.currentChampionId ||
          !item.data.wrestlerIds.includes(title.currentChampionId)
        ) {
          issues.push(`${title.name} è in palio, ma il campione non è in questo match`);
        }
      }
    } else {
      for (const id of item.data.wrestlerIds) {
        if (!byId.has(id)) issues.push("Un protagonista del segmento non è più nel roster");
      }
    }
  }
  return issues;
}

/** Registra lo show: match, segmenti, rivalità e titoli in un solo passaggio. */
export function runShow(input: RunShowInput): RunShowOutput {
  const { items, roster, titles, rivalries, saveId, showId, showName, date, seed, isSpecial } =
    input;
  const byId = new Map(roster.map((w) => [w.id, w] as const));
  const titleById = new Map(titles.map((t) => [t.id, t] as const));

  const updatedTitles = new Map<string, Championship>();
  const rivalriesOut = new Map<string, Rivalry>(rivalries.map((r) => [r.id, { ...r }]));
  const outcomes: ShowEntryOutcome[] = [];

  const rivalryOf = (a: string, b: string): Rivalry | null => {
    for (const r of rivalriesOut.values()) {
      if (r.status !== "attiva") continue;
      const [x, y] = r.participants;
      if ((x === a && y === b) || (x === b && y === a)) return r;
    }
    return null;
  };

  for (const item of items) {
    if (item.kind === "match") {
      const match = item.data;
      const a = byId.get(match.wrestlerIds[0]);
      const b = byId.get(match.wrestlerIds[1]);
      if (!a || !b) continue; // la validazione pre-run garantisce il roster
      const matchSeed = matchSeedFor(seed, date, showId, match.id);
      const sim = simulateMatch([toWrestlerDef(a), toWrestlerDef(b)], matchSeed);
      const winner = sim.wrestlers[sim.winner].id === a.id ? a : b;
      const loser = winner.id === a.id ? b : a;
      const rivalry = rivalryOf(a.id, b.id);
      const title = match.titleId
        ? updatedTitles.get(match.titleId) ?? titleById.get(match.titleId) ?? null
        : null;

      let defense = false;
      let titleChange: MatchOutcome["titleChange"] = null;
      if (title && title.currentChampionId === winner.id) {
        // Il campione difende: il regno conta la difesa riuscita.
        defense = true;
        const reigns = title.reigns.map((r, i) =>
          i === title.reigns.length - 1 ? { ...r, defenses: r.defenses + 1 } : r
        );
        updatedTitles.set(title.id, { ...title, reigns });
      } else if (title && title.currentChampionId === loser.id) {
        // Il campione perde: titolo che cambia di mani, il regno finisce oggi.
        titleChange = { titleId: title.id, newChampionId: winner.id };
        updatedTitles.set(title.id, crownChampion(title, winner, date));
      }

      outcomes.push({
        kind: "match",
        match,
        winnerId: winner.id,
        loserId: loser.id,
        summary: sim.summary,
        rating: matchRating(a, b, {
          titlePrestige: title ? title.prestige : 0,
          rivalryIntensity: rivalry ? rivalry.intensity : 0,
        }),
        seed: matchSeed,
        titleChange,
        defense,
      });

      if (rivalry) {
        if (rivalry.phase === "culmine") {
          rivalriesOut.set(
            rivalry.id,
            resolveRivalry(
              rivalry,
              date,
              `La rivalità si chiude sul ring: vince ${winner.name}.`
            )
          );
        } else {
          rivalriesOut.set(
            rivalry.id,
            advanceRivalry(
              rivalry,
              1,
              1,
              6 + winner.stats.charisma,
              `${winner.name} batte ${loser.name}: la storia si scalda.`
            )
          );
        }
      }
    } else {
      const segment = item.data;
      const pros = segment.wrestlerIds
        .map((id) => byId.get(id))
        .filter((w): w is Wrestler => Boolean(w));
      if (pros.length === 0) continue;
      const rng = mulberry32(seedFromString(segmentSeedFor(seed, date, showId, segment.id)));
      const text = segmentText(segment.kind, pros.map((w) => w.name), rng);
      outcomes.push({
        kind: "segment",
        segment,
        text,
        rating: segmentRating(segment.kind, pros, rng),
      });

      for (const r of rivalriesOut.values()) {
        if (r.status !== "attiva") continue;
        const [x, y] = r.participants;
        const xIn = segment.wrestlerIds.includes(x);
        const yIn = segment.wrestlerIds.includes(y);
        if (xIn && yIn) {
          rivalriesOut.set(
            r.id,
            advanceRivalry(r, 1, 1, 4, `Stessi protagonisti in un segmento: la tensione sale.`)
          );
        } else if (xIn || yIn) {
          rivalriesOut.set(r.id, { ...r, heat: clamp(r.heat + 1, 0, 100) });
        }
      }
    }
  }

  // Valutazione d'insieme: i match pesano il triplo dei segmenti;
  // un titolo in palio scalda la serata.
  let weightSum = 0;
  let score = 0;
  let hasTitle = false;
  for (const o of outcomes) {
    const w = o.kind === "match" ? 3 : 1;
    weightSum += w;
    score += o.rating * w;
    if (o.kind === "match" && (o.defense || o.titleChange)) hasTitle = true;
  }
  const rating =
    outcomes.length > 0
      ? Math.round(clamp(score / weightSum + (hasTitle ? 3 : 0), 5, 99))
      : 0;

  const result: ShowResult = {
    id: `${saveId}::${showId}::${date}`,
    saveId,
    showId,
    showName,
    date,
    isSpecial,
    outcomes,
    rating,
    verdict: showVerdict(rating),
    createdAt: "",
  };
  return { result, titles: [...updatedTitles.values()], rivalries: [...rivalriesOut.values()] };
}
