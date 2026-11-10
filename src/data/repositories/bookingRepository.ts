import { db } from "../database";
import type { ShowCard, ShowResult } from "../../game/types/booking";

// Persistenza del booking (C4): card degli show e risultati registrati.
// La UI non tocca mai Dexie direttamente: passa da qui (Documento Master §9.2).

/** Chiave della card di uno show dentro un salvataggio. */
export function cardId(saveId: string, showId: string): string {
  return `${saveId}::${showId}`;
}

/** Chiave del risultato di uno show registrato. */
export function resultId(saveId: string, showId: string, date: string): string {
  return `${saveId}::${showId}::${date}`;
}

/** Tutte le card di una federazione (settimanali + eventi speciali). */
export async function listCards(saveId: string): Promise<ShowCard[]> {
  return db.showCards.where("saveId").equals(saveId).toArray();
}

export async function getCard(saveId: string, showId: string): Promise<ShowCard | null> {
  return (await db.showCards.get(cardId(saveId, showId))) ?? null;
}

export async function saveCard(card: ShowCard): Promise<void> {
  await db.showCards.put(card);
}

export async function deleteCard(id: string): Promise<void> {
  await db.showCards.delete(id);
}

/** Risultati registrati, il più recente prima. */
export async function listShowResults(saveId: string, limit = 40): Promise<ShowResult[]> {
  const rows = await db.showResults.where("saveId").equals(saveId).toArray();
  return rows
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function addShowResult(result: ShowResult): Promise<void> {
  await db.showResults.put(result);
}

/** Cancella card e risultati di una federazione (con la federazione). */
export async function removeBookingData(saveId: string): Promise<void> {
  await db.showCards.where("saveId").equals(saveId).delete();
  await db.showResults.where("saveId").equals(saveId).delete();
}
