import { describe, expect, it } from "vitest";
import {
  ARENA_COST,
  ARENA_COST_SPECIAL,
  MAX_TRANSACTIONS,
  SPONSOR_BASE,
  SPONSOR_BONUS_GOOD,
  STARTING_BALANCE,
  TICKET_PRICE,
  applyShowFinance,
  isoWeekKey,
  showFinanceBreakdown,
} from "./economy";
import type { CareerFinance } from "../types/career";

const emptyFinance: CareerFinance = { balance: STARTING_BALANCE, transactions: [] };

describe("isoWeekKey", () => {
  it("raggruppa la stessa settimana di gioco", () => {
    expect(isoWeekKey("2027-01-04")).toBe(isoWeekKey("2027-01-10"));
    expect(isoWeekKey("2027-01-04")).not.toBe(isoWeekKey("2027-01-11"));
  });
});

describe("showFinanceBreakdown", () => {
  it("calcola biglietti, merchandising, sponsor e arena", () => {
    const b = showFinanceBreakdown({
      rating: 60,
      isSpecial: false,
      viewers: 9000,
      showName: "Punto d\u2019Incontro",
      date: "2027-01-04",
      weeklyPayroll: 12000,
    });
    expect(b.tickets).toBe(Math.round(9000 / 9) * TICKET_PRICE);
    expect(b.merchandising).toBe(Math.round(9000 * 0.35));
    expect(b.sponsor).toBe(SPONSOR_BASE);
    expect(b.arena).toBe(ARENA_COST);
    expect(b.net).toBe(b.tickets + b.merchandising + b.sponsor - b.arena - 12000);
  });

  it("gli eventi speciali costano di più e valgono di più", () => {
    const s = showFinanceBreakdown({
      rating: 88,
      isSpecial: true,
      viewers: 20000,
      showName: "Notte dei Conti",
      date: "2027-02-14",
      weeklyPayroll: 12000,
    });
    expect(s.arena).toBe(ARENA_COST_SPECIAL);
    expect(s.sponsor).toBe(SPONSOR_BASE + 3000);
  });

  it("il bonus sponsor premia i buoni show", () => {
    const good = showFinanceBreakdown({
      rating: 75,
      isSpecial: false,
      viewers: 9000,
      showName: "Show",
      date: "2027-01-04",
      weeklyPayroll: 0,
    });
    expect(good.sponsor).toBe(SPONSOR_BASE + SPONSOR_BONUS_GOOD);
  });
});

describe("applyShowFinance", () => {
  it("registra ogni voce e aggiorna il saldo", () => {
    const b = showFinanceBreakdown({
      rating: 60,
      isSpecial: false,
      viewers: 9000,
      showName: "Show",
      date: "2027-01-04",
      weeklyPayroll: 12000,
    });
    const next = applyShowFinance(emptyFinance, b);
    expect(next.balance).toBe(STARTING_BALANCE + b.net);
    expect(next.transactions[0].balanceAfter).toBe(next.balance);
    expect(next.transactions.length).toBe(5); // biglietti, merch, sponsor, arena, stipendi
  });

  it("gli stipendi si pagano una sola volta a settimana di gioco", () => {
    const first = showFinanceBreakdown({
      rating: 60,
      isSpecial: false,
      viewers: 9000,
      showName: "Lunedì",
      date: "2027-01-04",
      weeklyPayroll: 12000,
    });
    const afterFirst = applyShowFinance(emptyFinance, first);
    const second = showFinanceBreakdown({
      rating: 60,
      isSpecial: false,
      viewers: 9000,
      showName: "Venerdì",
      date: "2027-01-08",
      weeklyPayroll: 12000,
    });
    const afterSecond = applyShowFinance(afterFirst, second);
    // 4 voci: niente stipendi già pagati questa settimana.
    expect(afterSecond.transactions.length).toBe(afterFirst.transactions.length + 4);
    expect(afterSecond.balance).toBe(afterFirst.balance + second.net + 12000);
    // La settimana dopo gli stipendi tornano.
    const third = showFinanceBreakdown({
      rating: 60,
      isSpecial: false,
      viewers: 9000,
      showName: "Lunedì",
      date: "2027-01-11",
      weeklyPayroll: 12000,
    });
    const afterThird = applyShowFinance(afterSecond, third);
    expect(afterThird.transactions.length).toBe(afterSecond.transactions.length + 5);
  });

  it("il registro resta limitato alle ultime transazioni", () => {
    let finance = emptyFinance;
    for (let i = 0; i < 30; i++) {
      const b = showFinanceBreakdown({
        rating: 60,
        isSpecial: false,
        viewers: 9000,
        showName: `Show ${i}`,
        date: `2027-03-${String((i % 28) + 1).padStart(2, "0")}`,
        weeklyPayroll: 0,
      });
      finance = applyShowFinance(finance, b);
    }
    expect(finance.transactions.length).toBe(MAX_TRANSACTIONS);
  });
});
