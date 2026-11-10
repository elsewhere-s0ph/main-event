import type { MatchType } from "../types/booking";
import type { Wrestler } from "../types/roster";

// Tipi di match (C6, parte non visiva): catalogo, validazione e risoluzione
// dei match a più atleti. Il motore 1v1 resta intoccabile (la timeline è
// accoppiata al renderer): tag, triple threat e fatal 4-way si risolvono qui,
// in puro e deterministico. Gabbia, scale e hardcore restano 1v1 con flavor.

export interface MatchTypeDef {
  id: MatchType;
  label: string;
  /** Quanti atleti in ring. */
  size: number;
  /** Il titolo deve essere in palio (match alle scale). */
  needsTitle: boolean;
  /** Bonus di spettacolo sulla valutazione del match. */
  ratingBonus: number;
  blurb: string;
}

export const MATCH_TYPES: readonly MatchTypeDef[] = [
  { id: "singolo", label: "Singolo", size: 2, needsTitle: false, ratingBonus: 0, blurb: "Uno contro uno: la classica." },
  { id: "tag", label: "Tag team", size: 4, needsTitle: false, ratingBonus: 3, blurb: "2 contro 2: il tag cambia le sorti della serata." },
  { id: "triple", label: "Triple threat", size: 3, needsTitle: false, ratingBonus: 4, blurb: "Tre in ring: basta uno schienamento." },
  { id: "fatal4", label: "Fatal 4-way", size: 4, needsTitle: false, ratingBonus: 5, blurb: "Quattro in ring, alleanze fino al primo tradimento." },
  { id: "cage", label: "Gabbia", size: 2, needsTitle: false, ratingBonus: 6, blurb: "Niente squalifiche, niente fughe: si esce vincenti." },
  { id: "ladder", label: "Scale", size: 2, needsTitle: true, ratingBonus: 5, blurb: "Il titolo appeso: chi scala prima, vince." },
  { id: "hardcore", label: "Hardcore", size: 2, needsTitle: false, ratingBonus: 5, blurb: "Nessuna regola: tavoli, sedie e rimpianti." },
];

export const MATCH_TYPE_LABELS: Record<MatchType, string> = Object.fromEntries(
  MATCH_TYPES.map((t) => [t.id, t.label])
) as Record<MatchType, string>;

export function matchTypeById(id: MatchType): MatchTypeDef {
  return MATCH_TYPES.find((t) => t.id === id) ?? MATCH_TYPES[0];
}

/** Regole di composizione di un match: numero di atleti, doppioni, stipulazioni. */
export function matchIssues(
  type: MatchType,
  wrestlerIds: string[],
  titleId: string | null
): string[] {
  const def = matchTypeById(type);
  const issues: string[] = [];
  if (wrestlerIds.length !== def.size) {
    issues.push(`${def.label}: servono esattamente ${def.size} atleti`);
  }
  if (new Set(wrestlerIds).size !== wrestlerIds.length) {
    issues.push("Lo stesso atleta è stato scelto due volte nello stesso match");
  }
  if (def.needsTitle && !titleId) {
    issues.push("Il match alle scale ha bisogno di un titolo appeso sopra il ring");
  }
  return issues;
}

/** Punteggio di forza sintetico: la scala pesa, il carisma guida il finale. */
function score(w: Wrestler): number {
  return w.stats.power * 2 + w.stats.agility * 1.5 + w.stats.stamina + w.stats.charisma * 0.5;
}

export interface MultiResolution {
  winner: Wrestler;
  loser: Wrestler;
  summary: string;
}

/**
 * Risolve un match a più atleti (tag, triple threat, fatal 4-way).
 * Peso esponenziale sul punteggio: la forza guida, il rng decide — e in un
 * match così affollato sorprende spesso.
 */
export function resolveMultiMatch(
  rng: () => number,
  type: "tag" | "triple" | "fatal4",
  ws: Wrestler[]
): MultiResolution {
  const weighted = (list: Wrestler[]): Wrestler => {
    const total = list.reduce((sum, w) => sum + Math.pow(score(w), 2.2), 0);
    let roll = rng() * total;
    for (const w of list) {
      roll -= Math.pow(score(w), 2.2);
      if (roll <= 0) return w;
    }
    return list[list.length - 1];
  };

  if (type === "tag") {
    const teamA = [ws[0], ws[1]];
    const teamB = [ws[2], ws[3]];
    // Chimica della squadra: un fattore casuale che può rovesciare i pronostici.
    const chem = rng() * 4;
    const sa = (score(teamA[0]) + score(teamA[1])) / 2 + chem;
    const sb = (score(teamB[0]) + score(teamB[1])) / 2;
    const winners = sa >= sb ? teamA : teamB;
    const losers = sa >= sb ? teamB : teamA;
    const winner = winners.reduce((a, b) => (score(b) > score(a) ? b : a));
    const loser = losers.reduce((a, b) => (score(b) < score(a) ? b : a));
    return {
      winner,
      loser,
      summary:
        `Tag team: ${winners.map((w) => w.name).join(" e ")} battono ` +
        `${losers.map((w) => w.name).join(" e ")}. Hot tag dal apron, ` +
        `${winner.finisher} e schienamento di ${winner.name} su ${loser.name}.`,
    };
  }

  const winner = weighted(ws);
  const rest = ws.filter((w) => w.id !== winner.id);
  const loser = weighted(rest);
  const label = type === "triple" ? "triple threat" : "fatal 4-way";
  return {
    winner,
    loser,
    summary:
      `${winner.name} sopravvive al ${label}: caos in ring, quasi-schiamenti ` +
      `in ogni angolo e un ${winner.finisher} che chiude la storia su ${loser.name}.`,
  };
}

/** Valutazione di un match a più atleti: 5–99. */
export function multiManRating(
  ws: Wrestler[],
  opts: { titlePrestige: number; rivalryIntensity: number; ratingBonus: number }
): number {
  const charisma = ws.reduce((sum, w) => sum + w.stats.charisma, 0) / Math.max(1, ws.length);
  const scores = ws.map(score);
  const spread = Math.max(...scores) - Math.min(...scores);
  const balance = Math.max(0, 10 - spread * 0.5);
  const raw =
    44 + charisma * 3.4 + balance + opts.titlePrestige * 0.8 + opts.rivalryIntensity * 1.6 + opts.ratingBonus;
  return Math.round(Math.max(5, Math.min(99, raw)));
}

const RULE_LINES: Record<"cage" | "ladder" | "hardcore", readonly string[]> = {
  cage: [
    "La gabbia tiene tutti dentro: nessuna fuga, solo {w} che chiude i conti.",
    "Acciaio e rancore: {w} lascia {l} a terra dentro la gabbia.",
  ],
  ladder: [
    "Le scale tremano: {w} stacca il premio mentre {l} guarda dal tappeto.",
    "Salita finale di {w}: {l} arriva un secondo tardi, come sempre.",
  ],
  hardcore: [
    "Tavoli, sedie e zero regole: {w} lascia {l} sotto le macerie.",
    "Nessun conteggio regge: {w} chiude nel modo più brutto possibile.",
  ],
};

/** Riga di cronaca per le stipulazioni 1v1: vuota per i match normali. */
export function ruleFlavor(
  type: MatchType,
  winnerName: string,
  loserName: string,
  rng: () => number
): string {
  if (type !== "cage" && type !== "ladder" && type !== "hardcore") return "";
  const lines = RULE_LINES[type];
  const line = lines[Math.floor(rng() * lines.length)] ?? lines[0];
  return ` ${line.replace("{w}", winnerName).replace("{l}", loserName)}`;
}
