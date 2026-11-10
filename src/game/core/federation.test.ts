import { describe, expect, it } from "vitest";
import {
  DAY_LABELS,
  defaultIdentity,
  monogramInitials,
  validateIdentity,
} from "./federation";

const base = {
  colors: { primary: "#8b5cf6", secondary: "#2dd4bf", accent: "#e879f9" },
  philosophy: "spettacolare",
  shows: [{ name: "Martedì Night", day: 2 }],
  logo: null,
};

describe("validateIdentity", () => {
  it("accetta un'identità completa", () => {
    expect(validateIdentity(base).ok).toBe(true);
  });

  it("rifiuta un colore non esadecimale", () => {
    const res = validateIdentity({ ...base, colors: { ...base.colors, primary: "viola" } });
    expect(res.ok).toBe(false);
  });

  it("rifiuta una filosofia sconosciuta", () => {
    const res = validateIdentity({ ...base, philosophy: "caos" });
    expect(res.ok).toBe(false);
  });

  it("rifiuta zero show", () => {
    const res = validateIdentity({ ...base, shows: [] });
    expect(res.ok).toBe(false);
  });

  it("rifiuta nomi di show duplicati, anche se cambiano solo le maiuscole", () => {
    const res = validateIdentity({
      ...base,
      shows: [
        { name: "Ignition", day: 1 },
        { name: "ignition", day: 2 },
      ],
    });
    expect(res.ok).toBe(false);
  });

  it("rifiuta due show nello stesso giorno", () => {
    const res = validateIdentity({
      ...base,
      shows: [
        { name: "Ignition", day: 1 },
        { name: "Uprising", day: 1 },
      ],
    });
    expect(res.ok).toBe(false);
  });

  it("accetta al massimo quattro show", () => {
    const shows = [
      { name: "Lunedi Night", day: 1 },
      { name: "Mercoledì Clash", day: 3 },
      { name: "Venerdì Storm", day: 5 },
      { name: "Domenica Finale", day: 7 },
    ];
    expect(validateIdentity({ ...base, shows }).ok).toBe(true);
    const tooMany = validateIdentity({
      ...base,
      shows: [...shows, { name: "Extra Show", day: 6 }],
    });
    expect(tooMany.ok).toBe(false);
  });
});

describe("monogramInitials", () => {
  it("usa le iniziali delle prime due parole", () => {
    expect(monogramInitials("Frontier Wrestling Alliance")).toBe("FW");
  });

  it("resiste a nomi con simboli", () => {
    expect(monogramInitials("!!! Wrestling")).toBe("WR");
  });

  it("ha un fallback per nomi senza lettere", () => {
    expect(monogramInitials("12345")).toBe("ME");
  });
});

describe("defaultIdentity", () => {
  it("parte con uno show al lunedì e nessun logo", () => {
    const identity = defaultIdentity();
    expect(identity.shows).toHaveLength(1);
    expect(identity.shows[0].day).toBe(1);
    expect(identity.logo).toBeNull();
    expect(DAY_LABELS[1]).toBe("Lunedì");
  });
});
