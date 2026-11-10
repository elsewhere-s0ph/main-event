import { describe, expect, it } from "vitest";
import { mulberry32, seedFromString } from "./rng";
import {
  MATCH_TYPES,
  MATCH_TYPE_LABELS,
  matchIssues,
  matchTypeById,
  multiManRating,
  resolveMultiMatch,
  ruleFlavor,
} from "./matchTypes";
import type { Wrestler } from "../types/roster";

function w(id: string, power: number, agility = 5, stamina = 5, charisma = 5): Wrestler {
  return {
    id,
    saveId: "save-1",
    name: id,
    nickname: "",
    gimmick: "",
    bodyType: "heavyweight",
    alignment: "face",
    stats: { power, agility, stamina, charisma },
    signature: "",
    finisher: "Finisher",
    colors: { trim: "#8b5cf6", skin: "#d9b08c" },
    contract: { weeklyPay: 400, signedOn: "2027-01-01", expiresOn: "2027-12-31" },
  };
}

describe("catalogo tipi di match", () => {
  it("i tipi a due sono singolo, gabbia, scale e hardcore", () => {
    for (const id of ["singolo", "cage", "ladder", "hardcore"] as const) {
      expect(matchTypeById(id).size).toBe(2);
    }
  });

  it("tag ha 4 atleti, triple 3, fatal4 4", () => {
    expect(matchTypeById("tag").size).toBe(4);
    expect(matchTypeById("triple").size).toBe(3);
    expect(matchTypeById("fatal4").size).toBe(4);
  });

  it("solo le scale richiedono un titolo in palio", () => {
    for (const t of MATCH_TYPES) {
      expect(t.needsTitle).toBe(t.id === "ladder");
    }
  });

  it("ogni tipo ha un'etichetta", () => {
    for (const t of MATCH_TYPES) {
      expect(MATCH_TYPE_LABELS[t.id].length).toBeGreaterThan(0);
    }
  });
});

describe("matchIssues", () => {
  it("un tag con 3 atleti non è valido", () => {
    expect(matchIssues("tag", ["w1", "w2", "w3"], null).length).toBe(1);
  });

  it("un doppione nello stesso match non è valido", () => {
    expect(matchIssues("triple", ["w1", "w2", "w2"], null).length).toBe(1);
  });

  it("le scale senza titolo non sono valide, col titolo sì", () => {
    expect(matchIssues("ladder", ["w1", "w2"], null).length).toBe(1);
    expect(matchIssues("ladder", ["w1", "w2"], "t1")).toEqual([]);
  });

  it("un singolo composto bene non ha problemi", () => {
    expect(matchIssues("singolo", ["w1", "w2"], null)).toEqual([]);
  });
});

describe("resolveMultiMatch", () => {
  const roster = [w("w1", 9), w("w2", 5), w("w3", 4, 6), w("w4", 3)];

  it("è deterministico: stesso rng, stessa risoluzione", () => {
    const a = resolveMultiMatch(mulberry32(seedFromString("s1")), "triple", roster.slice(0, 3));
    const b = resolveMultiMatch(mulberry32(seedFromString("s1")), "triple", roster.slice(0, 3));
    expect(a.winner.id).toBe(b.winner.id);
    expect(a.loser.id).toBe(b.loser.id);
    expect(a.summary).toBe(b.summary);
  });

  it("vincitore e sconfitto sono tra i partecipanti", () => {
    for (const type of ["tag", "triple", "fatal4"] as const) {
      const res = resolveMultiMatch(mulberry32(seedFromString("s2")), type, roster);
      const ids = roster.map((x) => x.id);
      expect(ids).toContain(res.winner.id);
      expect(ids).toContain(res.loser.id);
      expect(res.winner.id).not.toBe(res.loser.id);
      expect(res.summary.length).toBeGreaterThan(10);
    }
  });

  it("la forza pesa: su molti seed vince quasi sempre la squadra più forte", () => {
    const strong = [w("a1", 10), w("a2", 10)];
    const weak = [w("b1", 1), w("b2", 1)];
    let strongWins = 0;
    for (let i = 0; i < 40; i++) {
      const res = resolveMultiMatch(mulberry32(seedFromString(`tag-${i}`)), "tag", [...strong, ...weak]);
      if (res.winner.id === "a1" || res.winner.id === "a2") strongWins += 1;
    }
    expect(strongWins).toBeGreaterThanOrEqual(36);
  });
});

describe("multiManRating", () => {
  it("resta nei limiti 5–99 anche con squadre squilibrate", () => {
    const roster = [w("w1", 10, 10, 10, 10), w("w2", 1, 1, 1, 1), w("w3", 5), w("w4", 7)];
    const r = multiManRating(roster, { titlePrestige: 10, rivalryIntensity: 10, ratingBonus: 6 });
    expect(r).toBeGreaterThanOrEqual(5);
    expect(r).toBeLessThanOrEqual(99);
  });

  it("un roster forte e carismatico sfonda il 70", () => {
    const roster = [w("w1", 9, 8, 8, 9), w("w2", 8, 8, 9, 8), w("w3", 9, 9, 8, 9)];
    const r = multiManRating(roster, { titlePrestige: 8, rivalryIntensity: 6, ratingBonus: 5 });
    expect(r).toBeGreaterThan(70);
  });
});

describe("ruleFlavor", () => {
  it("i match normali non hanno flavor aggiuntivo", () => {
    expect(ruleFlavor("singolo", "A", "B", mulberry32(1))).toBe("");
    expect(ruleFlavor("tag", "A", "B", mulberry32(1))).toBe("");
  });

  it("gabbia, scale e hardcore aggiungono una riga di cronaca", () => {
    for (const type of ["cage", "ladder", "hardcore"] as const) {
      const line = ruleFlavor(type, "Alfa", "Bravo", mulberry32(seedFromString("f1")));
      expect(line.length).toBeGreaterThan(10);
      expect(line).toContain("Alfa");
    }
  });
});
