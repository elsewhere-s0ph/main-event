import { describe, expect, it } from "vitest";
import { simulateMultiMatch } from "./multiMatchEngine";
import { DEMO_WRESTLERS } from "./demoRoster";
import type { WrestlerDef } from "../types/match";

// Stessi invarianti del motore 1v1, applicati ai match affollati: valgono
// per OGNI seed e per OGNI tipo (tag, triple threat, fatal 4-way).
const MANY_SEEDS = [
  "energia",
  "demo",
  "demo-a",
  "demo-b",
  "timeline",
  "pin",
  "cap",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];

const variant = (w: WrestlerDef, i: number): WrestlerDef => ({
  ...w,
  id: w.id + "-b" + i,
  name: w.name + " II",
});

const FOUR: readonly WrestlerDef[] = [...DEMO_WRESTLERS, ...DEMO_WRESTLERS.map(variant)];
const THREE = FOUR.slice(0, 3);

const TYPES = [
  { type: "tag" as const, ws: FOUR },
  { type: "triple" as const, ws: THREE },
  { type: "fatal4" as const, ws: FOUR },
];

describe("simulateMultiMatch", () => {
  it("è deterministico: stesso seed, identico incontro, per ogni tipo", () => {
    for (const { type, ws } of TYPES) {
      const a = simulateMultiMatch(ws, "demo", type);
      const b = simulateMultiMatch(ws, "demo", type);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it("chiude sempre con vincitore, perdente e evento 'win', su molti seed", () => {
    for (const { type, ws } of TYPES) {
      for (const seed of MANY_SEEDS) {
        const r = simulateMultiMatch(ws, seed, type);
        expect(r.winner).toBeGreaterThanOrEqual(0);
        expect(r.winner).toBeLessThan(ws.length);
        expect(r.loser).toBeDefined();
        expect(r.loser).not.toBe(r.winner);
        const last = r.events[r.events.length - 1];
        expect(last?.kind).toBe("win");
        expect(last?.actor).toBe(r.winner);
      }
    }
  });

  it("produce una timeline ordinata e coerente, su molti seed", () => {
    for (const { type, ws } of TYPES) {
      for (const seed of MANY_SEEDS) {
        const r = simulateMultiMatch(ws, seed, type);
        let prevT = -1;
        for (const e of r.events) {
          expect(e.t).toBeGreaterThan(prevT);
          expect(e.durMs).toBeGreaterThan(0);
          prevT = e.t;
        }
        const last = r.events[r.events.length - 1];
        expect(r.durationMs).toBeGreaterThanOrEqual((last?.t ?? 0) + (last?.durMs ?? 0));
      }
    }
  });

  it("l'energia resta in [0, 100] e chi perde è a pezzi, su molti seed", () => {
    for (const { type, ws } of TYPES) {
      for (const seed of MANY_SEEDS) {
        const r = simulateMultiMatch(ws, seed, type);
        for (const e of r.events) {
          expect(e.energyAfter.length).toBe(ws.length);
          for (const v of e.energyAfter) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(100);
          }
        }
        expect(r.finalEnergy[r.loser ?? -1]).toBeLessThanOrEqual(30);
      }
    }
  });

  it("dopo uno schienamento c'è kickout o vittoria, su molti seed", () => {
    for (const { type, ws } of TYPES) {
      for (const seed of MANY_SEEDS) {
        const r = simulateMultiMatch(ws, seed, type);
        for (let i = 0; i < r.events.length; i++) {
          if (r.events[i]?.kind === "pin") {
            const next = r.events[i + 1];
            expect(next?.kind === "kickout" || next?.kind === "win").toBe(true);
          }
        }
      }
    }
  });

  it("il numero di eventi resta contenuto, su molti seed", () => {
    for (const { type, ws } of TYPES) {
      for (const seed of MANY_SEEDS) {
        const r = simulateMultiMatch(ws, seed, type);
        expect(r.events.length).toBeLessThan(250);
      }
    }
  });

  it("nel tag la cronaca cita le squadre", () => {
    const r = simulateMultiMatch(FOUR, "cambi", "tag");
    expect(r.summary).toContain("Tag team");
    expect(r.summary).toContain(" e ");
  });

  it("triple threat e fatal 4-way raccontano il sopravvissuto", () => {
    expect(simulateMultiMatch(THREE, "sopravvissuto", "triple").summary).toContain("triple threat");
    expect(simulateMultiMatch(FOUR, "sopravvissuto", "fatal4").summary).toContain("fatal 4-way");
  });
});
