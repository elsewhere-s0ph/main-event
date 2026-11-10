import type { CareerFinance, FinanceTransaction } from "../types/career";

// Economia (C5): ogni euro entra o esce con una riga di registro.
// Il bilancio non è mai un numero modificato a mano: è la somma delle
// transazioni (Documento Master §8). Modulo puro e deterministico.

export const STARTING_BALANCE = 50000;

export const TICKET_PRICE = 28;
export const TICKET_PRICE_SPECIAL = 55;
export const ARENA_COST = 4200;
export const ARENA_COST_SPECIAL = 15000;
export const SPONSOR_BASE = 2500;
/** Bonus sponsor per show di qualità: rating ≥ 70 e ≥ 85. */
export const SPONSOR_BONUS_GOOD = 1500;
export const SPONSOR_BONUS_GREAT = 3000;
export const MERCH_PER_VIEWER = 0.35;
/** Le transazioni in registro: le più recenti prima. */
export const MAX_TRANSACTIONS = 60;

export interface ShowFinanceBreakdown {
  /** Data di gioco dello show (ISO, parte data). */
  date: string;
  showName: string;
  isSpecial: boolean;
  tickets: number;
  merchandising: number;
  sponsor: number;
  arena: number;
  /** Stipendi settimanali: addebitati una sola volta a settimana di gioco. */
  payroll: number;
  /** Risultato netto dello show (con gli stipendi solo se addebitati). */
  net: number;
}

export function fmtEuro(n: number): string {
  return `${n < 0 ? "−" : ""}${Math.abs(Math.round(n)).toLocaleString("it-IT")} €`;
}

/** Chiave della settimana ISO (es. "2027-W02"): gli stipendi si pagano una volta a settimana. */
export function isoWeekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7; // lunedì = 1 … domenica = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // il giovedì della settimana ISO
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Il conto dello show: biglietti dal pubblico, merchandising dagli spettatori,
 * sponsor con bonus sulla qualità, arena e stipendi in uscita.
 */
export function showFinanceBreakdown(input: {
  rating: number;
  isSpecial: boolean;
  viewers: number;
  showName: string;
  date: string;
  weeklyPayroll: number;
}): ShowFinanceBreakdown {
  const price = input.isSpecial ? TICKET_PRICE_SPECIAL : TICKET_PRICE;
  const attendance = Math.round(input.viewers / (input.isSpecial ? 6 : 9));
  const tickets = attendance * price;
  const merchandising = Math.round(input.viewers * MERCH_PER_VIEWER);
  const sponsor =
    SPONSOR_BASE +
    (input.rating >= 85 ? SPONSOR_BONUS_GREAT : input.rating >= 70 ? SPONSOR_BONUS_GOOD : 0);
  const arena = input.isSpecial ? ARENA_COST_SPECIAL : ARENA_COST;
  return {
    date: input.date,
    showName: input.showName,
    isSpecial: input.isSpecial,
    tickets,
    merchandising,
    sponsor,
    arena,
    payroll: input.weeklyPayroll,
    net: tickets + merchandising + sponsor - arena - input.weeklyPayroll,
  };
}

function pushTransaction(
  list: FinanceTransaction[],
  tx: Omit<FinanceTransaction, "balanceAfter">,
  balance: number
): { list: FinanceTransaction[]; balance: number } {
  const balanceAfter = balance + tx.amount;
  return { list: [{ ...tx, balanceAfter }, ...list], balance: balanceAfter };
}

/**
 * Applica il conto dello show al bilancio: una transazione per voce.
 * Gli stipendi settimanali si addebitano solo alla prima registrazione
 * della settimana di gioco (la data avanza show dopo show).
 */
export function applyShowFinance(
  finance: CareerFinance,
  breakdown: ShowFinanceBreakdown
): CareerFinance {
  let balance = finance.balance;
  let list = finance.transactions;

  const payrollKey = isoWeekKey(breakdown.date);
  const payrollAlreadyCharged = finance.transactions.some(
    (t) => t.label === "Stipendi settimanali" && isoWeekKey(t.date) === payrollKey
  );

  const steps: Array<Omit<FinanceTransaction, "balanceAfter">> = [
    {
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      date: breakdown.date,
      label: `Biglietti — ${breakdown.showName}`,
      amount: breakdown.tickets,
      kind: "incasso",
    },
    {
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      date: breakdown.date,
      label: "Merchandising",
      amount: breakdown.merchandising,
      kind: "incasso",
    },
    {
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      date: breakdown.date,
      label: "Sponsor",
      amount: breakdown.sponsor,
      kind: "incasso",
    },
    {
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      date: breakdown.date,
      label: `Arena — ${breakdown.showName}`,
      amount: -breakdown.arena,
      kind: "spesa",
    },
  ];
  if (!payrollAlreadyCharged) {
    steps.push({
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      date: breakdown.date,
      label: "Stipendi settimanali",
      amount: -breakdown.payroll,
      kind: "spesa",
    });
  }

  for (const step of steps) {
    const next = pushTransaction(list, step, balance);
    list = next.list;
    balance = next.balance;
  }

  return { balance, transactions: list.slice(0, MAX_TRANSACTIONS) };
}
