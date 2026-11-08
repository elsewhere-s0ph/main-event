import { describe, expect, it } from "vitest";
import { simulateMatch } from "./matchEngine";
import { DEMO_WRESTLERS } from "./demoRoster";

describe("simulateMatch", () => {
  it("è deterministica: stesso seed, identico incontro", () => {
    const a = simulateMatch(DEMO_WRESTLERS, "demo");
    const b = simulateMatch(DEMO_WRESTLERS, "demo");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("seed diversi producono incontri diversi", () => {
    const a = simulateMatch(DEMO_WRESTLERS, "demo-a");
    const b = simulateMatch(DEMO_WRESTLERS, "demo-b");
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("termina sempre con un vincitore e chiude con l'evento 'win'", () => {
    for (const seed of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      const r = simulateMatch(DEMO_WRESTLERS, seed);
      expect(r.winner === 0 || r.winner === 1).toBe(true);
      const last = r.events[r.events.length - 1];
      expect(last?.kind).toBe("win");
      expect(last?.actor).toBe(r.winner);
    }
  });

  it("produce una timeline ordinata e coerente", () => {
    const r = simulateMatch(DEMO_WRESTLERS, "timeline");
    let prevT = -1;
    for (const e of r.events) {
      expect(e.t).toBeGreaterThan(prevT);
      expect(e.durMs).toBeGreaterThan(0);
      prevT = e.t;
    }
    const last = r.events[r.events.length - 1];
    expect(r.durationMs).toBeGreaterThanOrEqual((last?.t ?? 0) + (last?.durMs ?? 0));
  });

  it("l'energia resta in [0, 100] e chi perde è a pezzi", () => {
    const r = simulateMatch(DEMO_WRESTLERS, "energia");
    for (const e of r.events) {
      for (const v of e.energyAfter) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
    const last = r.events[r.events.length - 1];
    const loser = r.winner === 0 ? 1 : 0;
    expect((last?.energyAfter ?? [100, 100])[loser]).toBeLessThanOrEqual(30);
  });

  it("dopo uno schienamento c'è kickout o vittoria", () => {
    const r = simulateMatch(DEMO_WRESTLERS, "pin");
    for (let i = 0; i < r.events.length; i++) {
      if (r.events[i]?.kind === "pin") {
        const next = r.events[i + 1];
        expect(next?.kind === "kickout" || next?.kind === "win").toBe(true);
      }
    }
  });

  it("il numero di eventi resta contenuto", () => {
    const r = simulateMatch(DEMO_WRESTLERS, "cap");
    expect(r.events.length).toBeLessThan(200);
  });
});
