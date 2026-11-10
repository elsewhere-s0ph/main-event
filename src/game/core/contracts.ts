import type { Wrestler, WrestlerContract } from "../types/roster";
import { addWeeks, weeklyPayFor } from "./rosterGenerator";

// Contratti (C3): stato derivato dalla data di gioco, rinnovo e liberazione.
// Funzioni pure e deterministiche: le regole vivono qui, non nella UI.

export type ContractStatus = "attivo" | "in scadenza" | "scaduto";

export const RENEWAL_WEEKS: readonly number[] = [26, 39, 52];

/** Anticipo (in settimane) oltre cui il contratto è "in scadenza". */
export const EXPIRY_WARNING_WEEKS = 8;

const DAY_MS = 86_400_000;

function daysBetween(today: string, target: string): number {
  return Math.floor(
    (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS
  );
}

export function contractStatus(contract: WrestlerContract, today: string): ContractStatus {
  const days = daysBetween(today, contract.expiresOn);
  if (days < 0) return "scaduto";
  if (days <= EXPIRY_WARNING_WEEKS * 7) return "in scadenza";
  return "attivo";
}

/** Settimane intere prima della scadenza (0 nell'ultima settimana). */
export function weeksRemaining(contract: WrestlerContract, today: string): number {
  return Math.floor(daysBetween(today, contract.expiresOn) / 7);
}

/**
 * Rinnovo: nuovo contratto firmato oggi, con la paga ricalcolata dagli
 * attributi attuali — migliorare un atleta costa, al rinnovo.
 */
export function renewContract(w: Wrestler, today: string, weeks: number): WrestlerContract {
  return {
    weeklyPay: weeklyPayFor(w.stats),
    signedOn: today,
    expiresOn: addWeeks(today, weeks),
  };
}
