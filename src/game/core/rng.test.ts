import { describe, expect, it } from "vitest";
import { mulberry32, seedFromString } from "./rng";

describe("mulberry32", () => {
  it("è deterministica: stesso seed, stessa sequenza", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produce valori in [0, 1)", () => {
    const rnd = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seed diversi producono sequenze diverse", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).not.toEqual(seqB);
  });
});

describe("seedFromString", () => {
  it("è stabile per lo stesso testo", () => {
    expect(seedFromString("main-event")).toBe(seedFromString("main-event"));
  });

  it("distingue testi diversi", () => {
    expect(seedFromString("alpha")).not.toBe(seedFromString("beta"));
  });

  it("produce valori a 32 bit", () => {
    const s = seedFromString("frontier");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(4294967295);
    expect(Number.isInteger(s)).toBe(true);
  });
});
