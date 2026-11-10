import { describe, expect, it } from "vitest";
import { contractStatus, renewContract, weeksRemaining } from "./contracts";
import { generateInitialRoster } from "./rosterGenerator";

const roster = generateInitialRoster("test", "save", "2027-01-01");
const w = roster[0];

describe("contractStatus", () => {
  const c = { weeklyPay: 400, signedOn: "2027-01-01", expiresOn: "2027-07-02" };

  it("attivo con molto tempo alla scadenza", () => {
    expect(contractStatus(c, "2027-02-01")).toBe("attivo");
  });

  it("in scadenza negli ultimi 56 giorni, incluso l'ultimo giorno", () => {
    expect(contractStatus(c, "2027-05-10")).toBe("in scadenza");
    expect(contractStatus(c, "2027-07-02")).toBe("in scadenza");
  });

  it("scaduto dal giorno dopo la scadenza", () => {
    expect(contractStatus(c, "2027-07-03")).toBe("scaduto");
  });
});

describe("weeksRemaining", () => {
  it("conta solo settimane intere", () => {
    const c = { weeklyPay: 400, signedOn: "2027-01-01", expiresOn: "2027-01-08" };
    expect(weeksRemaining(c, "2027-01-01")).toBe(1);
    expect(weeksRemaining({ ...c, expiresOn: "2027-01-07" }, "2027-01-01")).toBe(0);
    expect(weeksRemaining({ ...c, expiresOn: "2026-12-31" }, "2027-01-01")).toBeLessThanOrEqual(0);
  });
});

describe("renewContract", () => {
  it("parte da oggi e ricalcola la paga dagli attributi attuali", () => {
    const today = "2027-03-01";
    const nc = renewContract(w, today, 52);
    const avg = (w.stats.power + w.stats.agility + w.stats.stamina + w.stats.charisma) / 4;
    expect(nc.signedOn).toBe(today);
    expect(nc.expiresOn).toBe("2028-02-28");
    expect(nc.weeklyPay).toBe(150 + Math.round(avg * 40));
  });

  it("un atleta migliorato costa di più al rinnovo", () => {
    const improved = {
      ...w,
      stats: { power: 10, agility: 10, stamina: 10, charisma: 10 },
    };
    expect(renewContract(improved, "2027-03-01", 26).weeklyPay).toBeGreaterThan(
      renewContract(w, "2027-03-01", 26).weeklyPay
    );
  });
});
