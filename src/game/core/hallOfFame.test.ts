import { describe, expect, it } from "vitest";
import { bestMatches, bestShows, longestReigns, mostDefenses } from "./hallOfFame";
import type { ShowResult } from "../types/booking";
import type { Championship } from "../types/titles";

const nameOf = (id: string) => `Atleta ${id}`;

const result: ShowResult = {
  id: "save::show1::2027-01-04",
  saveId: "save",
  showId: "show1",
  showName: "Punto d\u2019Incontro",
  date: "2027-01-04",
  isSpecial: false,
  outcomes: [
    {
      kind: "match",
      match: { id: "m1", type: "singolo", wrestlerIds: ["w1", "w2"], titleId: null },
      winnerId: "w1",
      loserId: "w2",
      summary: "Vittoria netta.",
      rating: 71,
      seed: "s1",
      titleChange: null,
      defense: false,
    },
    {
      kind: "segment",
      segment: { id: "s1", kind: "promo", wrestlerIds: ["w3"] },
      text: "Promo acceso.",
      rating: 55,
    },
    {
      kind: "match",
      match: { id: "m2", type: "singolo", wrestlerIds: ["w3", "w4"], titleId: null },
      winnerId: "w4",
      loserId: "w3",
      summary: "Sorpresa finale.",
      rating: 84,
      seed: "s2",
      titleChange: null,
      defense: false,
    },
  ],
  rating: 74,
  verdict: "Grande show.",
  createdAt: "",
};

describe("bestMatches", () => {
  it("ordina per valutazione e considera solo i match", () => {
    const top = bestMatches([result], nameOf, 5);
    expect(top).toHaveLength(2);
    expect(top[0].rating).toBe(84);
    expect(top[0].a).toBe("Atleta w3");
    expect(top[0].showName).toBe("Punto d\u2019Incontro");
  });
});

describe("bestShows", () => {
  it("ordina gli show per valutazione", () => {
    const top = bestShows([result], 5);
    expect(top[0].rating).toBe(74);
    expect(top[0].isSpecial).toBe(false);
  });
});

const titles: Championship[] = [
  {
    id: "t1",
    saveId: "save",
    name: "Campionato Mondiale",
    category: "world",
    prestige: 10,
    currentChampionId: "w1",
    reigns: [
      {
        championId: "w2",
        championName: "Sfida",
        wonOn: "2026-12-01",
        lostOn: "2027-01-04",
        defenses: 2,
      },
      {
        championId: "w1",
        championName: "Monolite",
        wonOn: "2027-01-04",
        lostOn: null,
        defenses: 5,
      },
    ],
    createdAt: "",
  },
];

describe("longestReigns", () => {
  it("misura i regni in giorni e segna quelli in corso", () => {
    const top = longestReigns(titles, "2027-01-10", 5);
    expect(top[0].championName).toBe("Sfida");
    expect(top[0].days).toBe(35);
    expect(top[0].ongoing).toBe(false);
    expect(top[1].championName).toBe("Monolite");
    expect(top[1].days).toBe(7);
    expect(top[1].ongoing).toBe(true);
  });
});

describe("mostDefenses", () => {
  it("considera solo i regni con difese riuscite", () => {
    const top = mostDefenses(titles, 5);
    expect(top).toHaveLength(2);
    expect(top[0].defenses).toBe(5);
    expect(top[1].defenses).toBe(2);
  });
});
