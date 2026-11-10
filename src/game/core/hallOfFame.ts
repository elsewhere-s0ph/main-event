import type { ShowResult } from "../types/booking";
import type { Championship } from "../types/titles";
import { reignDays } from "./titles";

// Hall of Fame e archivio (C5): i record della federazione letti dai
// risultati degli show e dagli albi d'oro dei titoli. Tutto derivato:
// nessun dato duplicato, la storia è già lì. Modulo puro.

export interface HallMatch {
  showName: string;
  date: string;
  a: string;
  b: string;
  rating: number;
  summary: string;
}

/** I match meglio valutati della storia della federazione. */
export function bestMatches(
  results: ShowResult[],
  nameOf: (id: string) => string,
  limit: number
): HallMatch[] {
  const all: HallMatch[] = [];
  for (const r of results) {
    for (const o of r.outcomes) {
      if (o.kind !== "match") continue;
      all.push({
        showName: r.showName,
        date: r.date,
        a: nameOf(o.match.wrestlerIds[0]),
        b: nameOf(o.match.wrestlerIds[1]),
        rating: o.rating,
        summary: o.summary,
      });
    }
  }
  return all.sort((x, y) => y.rating - x.rating).slice(0, limit);
}

export interface HallShow {
  showName: string;
  date: string;
  rating: number;
  isSpecial: boolean;
}

/** Gli show meglio valutati della storia della federazione. */
export function bestShows(results: ShowResult[], limit: number): HallShow[] {
  return results
    .map((r) => ({ showName: r.showName, date: r.date, rating: r.rating, isSpecial: r.isSpecial }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export interface HallReign {
  titleName: string;
  championName: string;
  days: number;
  defenses: number;
  ongoing: boolean;
}

/** I regni più lunghi della storia della federazione (in giorni di gioco). */
export function longestReigns(titles: Championship[], today: string, limit: number): HallReign[] {
  const all: HallReign[] = [];
  for (const t of titles) {
    for (const r of t.reigns) {
      all.push({
        titleName: t.name,
        championName: r.championName,
        days: reignDays(r, today),
        defenses: r.defenses,
        ongoing: r.lostOn === null,
      });
    }
  }
  return all.sort((a, b) => b.days - a.days).slice(0, limit);
}

/** I regni con più difese riuscite: chi ha difeso il titolo davvero. */
export function mostDefenses(titles: Championship[], limit: number): HallReign[] {
  const all: HallReign[] = [];
  for (const t of titles) {
    for (const r of t.reigns) {
      if (r.defenses <= 0) continue;
      all.push({
        titleName: t.name,
        championName: r.championName,
        days: 0,
        defenses: r.defenses,
        ongoing: r.lostOn === null,
      });
    }
  }
  return all.sort((a, b) => b.defenses - a.defenses).slice(0, limit);
}
