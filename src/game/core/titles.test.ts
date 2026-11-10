import { describe, expect, it } from "vitest";
import {
  crownChampion,
  currentReign,
  isEligible,
  reignDays,
  vacateTitle,
} from "./titles";
import type { Championship } from "../types/titles";
import type { Wrestler } from "../types/roster";

const TODAY = "2027-01-01";

function emptyTitle(overrides: Partial<Championship> = {}): Championship {
  return {
    id: "title-test",
    saveId: "save-test",
    name: "Campionato di Prova",
    category: "world",
    prestige: 10,
    currentChampionId: null,
    reigns: [],
    createdAt: "2026-11-10T00:00:00.000Z",
    ...overrides,
  };
}

function wrestler(overrides: Partial<Wrestler> = {}): Wrestler {
  return {
    id: "w-test",
    saveId: "save-test",
    name: "Il Monolite",
    nickname: "La parete che cammina",
    gimmick: "Non parla mai: parlano i pugni.",
    bodyType: "heavyweight",
    alignment: "face",
    stats: { power: 9, agility: 3, stamina: 7, charisma: 5 },
    signature: "Pressa del Colosso",
    finisher: "Frana Mortale",
    colors: { trim: "#2dd4bf", skin: "#d9b08c" },
    contract: { weeklyPay: 400, signedOn: "2027-01-01", expiresOn: "2027-07-02" },
    ...overrides,
  };
}

describe("crownChampion", () => {
  it("apre il primo regno con il nome congelato nell'albo d'oro", () => {
    const t = crownChampion(emptyTitle(), wrestler(), TODAY);
    expect(t.currentChampionId).toBe("w-test");
    expect(t.reigns).toHaveLength(1);
    expect(t.reigns[0]).toEqual({
      championId: "w-test",
      championName: "Il Monolite",
      wonOn: TODAY,
      lostOn: null,
      defenses: 0,
    });
    expect(currentReign(t)?.championName).toBe("Il Monolite");
  });

  it("chiude il regno in corso quando incorona un altro wrestler", () => {
    const first = crownChampion(emptyTitle(), wrestler(), "2027-01-01");
    const second = crownChampion(
      first,
      wrestler({ id: "w-two", name: "Vespa", bodyType: "cruiserweight" }),
      "2027-03-01"
    );
    expect(second.reigns).toHaveLength(2);
    expect(second.reigns[0].lostOn).toBe("2027-03-01");
    expect(second.reigns[1].championId).toBe("w-two");
    expect(second.currentChampionId).toBe("w-two");
  });

  it("incoronare di nuovo lo stesso campione non cambia nulla", () => {
    const first = crownChampion(emptyTitle(), wrestler(), TODAY);
    expect(crownChampion(first, wrestler(), "2027-02-01")).toBe(first);
  });
});

describe("vacateTitle", () => {
  it("chiude il regno e rende vacante il titolo", () => {
    const crowned = crownChampion(emptyTitle(), wrestler(), TODAY);
    const vacated = vacateTitle(crowned, "2027-02-01");
    expect(vacated.currentChampionId).toBe(null);
    expect(vacated.reigns[0].lostOn).toBe("2027-02-01");
    expect(currentReign(vacated)).toBe(null);
  });

  it("rendere vacante un titolo già vacante non cambia nulla", () => {
    const t = emptyTitle();
    expect(vacateTitle(t, TODAY)).toBe(t);
  });
});

describe("reignDays", () => {
  it("conta almeno il giorno dell'incoronazione", () => {
    const reign = { championId: "w", championName: "x", wonOn: TODAY, lostOn: null, defenses: 0 };
    expect(reignDays(reign, TODAY)).toBe(1);
    expect(reignDays(reign, "2027-01-08")).toBe(8);
  });

  it("un regno chiuso non cambia più durata, anche se la data di gioco avanza", () => {
    const reign = { championId: "w", championName: "x", wonOn: "2027-01-01", lostOn: "2027-01-31", defenses: 0 };
    expect(reignDays(reign, "2027-02-01")).toBe(31);
    expect(reignDays(reign, "2028-06-01")).toBe(31);
  });
});

describe("isEligible", () => {
  it("i titoli di categoria sono riservati ai pesi leggeri", () => {
    const cruiser = emptyTitle({ category: "cruiserweight" });
    expect(isEligible(cruiser, wrestler({ bodyType: "cruiserweight" }))).toBe(true);
    expect(isEligible(cruiser, wrestler({ bodyType: "heavyweight" }))).toBe(false);
  });

  it("il titolo principale è aperto a tutti", () => {
    const world = emptyTitle({ category: "world" });
    expect(isEligible(world, wrestler({ bodyType: "heavyweight" }))).toBe(true);
    expect(isEligible(world, wrestler({ bodyType: "cruiserweight" }))).toBe(true);
  });
});
