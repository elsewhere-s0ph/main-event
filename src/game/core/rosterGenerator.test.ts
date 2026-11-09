import { describe, expect, it } from "vitest";
import { addWeeks, generateInitialRoster, ROSTER_BLUEPRINTS } from "./rosterGenerator";

const START = "2027-01-01";

function roster(seed: string, size?: number) {
  return generateInitialRoster(seed, "save-test", START, size);
}

describe("generateInitialRoster", () => {
  it("è deterministico: stesso seed → stesso roster", () => {
    for (const seed of ["TORINO", "milano-2027", "abc123", "zzz"]) {
      expect(roster(seed)).toEqual(roster(seed));
    }
  });

  it("seed diversi generano roster diversi", () => {
    const seeds = ["a", "b", "c", "d", "e", "f"];
    const rosters = new Set(seeds.map((s) => JSON.stringify(roster(s))));
    expect(rosters.size).toBeGreaterThan(1);
  });

  it("genera 8 wrestler con nomi e id univoci", () => {
    const r = roster("seed-8");
    expect(r).toHaveLength(8);
    expect(new Set(r.map((w) => w.id)).size).toBe(8);
    expect(new Set(r.map((w) => w.name)).size).toBe(8);
  });

  it("rispetta i vincoli di attributi per corporatura", () => {
    for (const seed of ["x1", "x2", "x3", "x4", "x5"]) {
      for (const w of roster(seed)) {
        const { power, agility, stamina, charisma } = w.stats;
        expect(power).toBeGreaterThanOrEqual(1);
        expect(power).toBeLessThanOrEqual(10);
        expect(agility).toBeGreaterThanOrEqual(1);
        expect(agility).toBeLessThanOrEqual(10);
        expect(stamina).toBeGreaterThanOrEqual(5);
        expect(stamina).toBeLessThanOrEqual(8);
        expect(charisma).toBeGreaterThanOrEqual(3);
        expect(charisma).toBeLessThanOrEqual(9);
        if (w.bodyType === "heavyweight") {
          expect(power).toBeGreaterThanOrEqual(7);
          expect(agility).toBeLessThanOrEqual(5);
        } else {
          expect(agility).toBeGreaterThanOrEqual(7);
          expect(power).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it("garantisce almeno 2 beniamini e 2 cattivi su ogni seed", () => {
    for (let i = 0; i < 20; i++) {
      const r = roster(`align-${i}`);
      const faces = r.filter((w) => w.alignment === "face").length;
      const heels = r.length - faces;
      expect(faces).toBeGreaterThanOrEqual(2);
      expect(heels).toBeGreaterThanOrEqual(2);
    }
  });

  it("contratti: firma alla data di inizio, scadenza futura, paga positiva", () => {
    for (const w of roster("contratti")) {
      expect(w.contract.signedOn).toBe(START);
      expect(w.contract.expiresOn > w.contract.signedOn).toBe(true);
      expect(w.contract.weeklyPay).toBeGreaterThan(0);
    }
  });

  it("i wrestler hanno tutti mosse e colori definiti", () => {
    for (const w of roster("mosse")) {
      expect(w.signature.length).toBeGreaterThan(0);
      expect(w.finisher.length).toBeGreaterThan(0);
      expect(w.colors.trim).toMatch(/^#[0-9a-f]{6}$/);
      expect(w.colors.skin).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("la dimensione richiesta viene rispettata (min 2, max blueprint)", () => {
    expect(roster("size", 2)).toHaveLength(2);
    expect(roster("size", 5)).toHaveLength(5);
    expect(roster("size", 99)).toHaveLength(ROSTER_BLUEPRINTS.length);
  });
});

describe("addWeeks", () => {
  it("somma settimane attraversando mesi e anni", () => {
    expect(addWeeks("2027-01-01", 1)).toBe("2027-01-08");
    expect(addWeeks("2027-01-01", 52)).toBe("2027-12-31");
    expect(addWeeks("2027-12-15", 4)).toBe("2028-01-12");
  });
});
