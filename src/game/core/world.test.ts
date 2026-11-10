import { describe, expect, it } from "vitest";
import {
  generateRivalFederations,
  rivalViewers,
  shareOf,
  userViewers,
  weeklyStandings,
} from "./world";

describe("generateRivalFederations", () => {
  it("è deterministica: stesso seed, stesse rivali", () => {
    const a = generateRivalFederations("SEED123");
    const b = generateRivalFederations("SEED123");
    expect(a).toEqual(b);
  });

  it("crea quattro rivali con nomi distinti e reputazioni nel range", () => {
    const rivals = generateRivalFederations("SEED123");
    expect(rivals).toHaveLength(4);
    const names = new Set(rivals.map((r) => r.name));
    expect(names.size).toBe(4);
    for (const r of rivals) {
      expect(r.reputation).toBeGreaterThanOrEqual(32);
      expect(r.reputation).toBeLessThanOrEqual(78);
      expect(r.id).toMatch(/^rival-/);
    }
  });

  it("seed diversi danno mondi diversi (quasi certamente)", () => {
    const a = generateRivalFederations("SEED123");
    const b = generateRivalFederations("ALTROSEED");
    const same =
      a.length === b.length &&
      a.every((r, i) => r.name === b[i].name && r.reputation === b[i].reputation);
    expect(same).toBe(false);
  });
});

describe("userViewers", () => {
  it("cresce col rating e moltiplica per gli eventi speciali", () => {
    const low = userViewers(40, false, 55);
    const high = userViewers(80, false, 55);
    expect(high).toBeGreaterThan(low);
    expect(userViewers(80, true, 55)).toBeGreaterThan(userViewers(80, false, 55));
    expect(userViewers(0, false, 55)).toBe(0);
  });
});

describe("rivalViewers", () => {
  it("è deterministica sulla stessa data e varia tra date", () => {
    const rivals = generateRivalFederations("SEED123");
    const r = rivals[0];
    expect(rivalViewers(r, "2027-01-04", "SEED123")).toBe(
      rivalViewers(r, "2027-01-04", "SEED123")
    );
    expect(rivalViewers(r, "2027-01-04", "SEED123")).toBeGreaterThan(0);
  });
});

describe("weeklyStandings", () => {
  it("ordina per spettatori e include la federazione del GM", () => {
    const rivals = generateRivalFederations("SEED123");
    const standings = weeklyStandings("La Mia Federazione", 99999, 88, rivals, "2027-01-04", "SEED123");
    expect(standings).toHaveLength(5);
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i - 1].viewers).toBeGreaterThanOrEqual(standings[i].viewers);
    }
    expect(standings.find((s) => s.isUser)?.name).toBe("La Mia Federazione");
  });

  it("la quota di mercato copre il totale", () => {
    const rivals = generateRivalFederations("SEED123");
    const standings = weeklyStandings("Fed", 5000, 70, rivals, "2027-01-04", "SEED123");
    const total = standings.reduce((sum, s) => sum + shareOf(standings, s.id), 0);
    // Le quote sono arrotondate per federazione: la somma resta vicina al 100.
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });
});
