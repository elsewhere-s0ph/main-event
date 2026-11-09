import { db } from "../database";
import type { Career } from "../../game/types/career";
import type { Wrestler } from "../../game/types/roster";
import { generateInitialRoster } from "../../game/core/rosterGenerator";

function byName(a: Wrestler, b: Wrestler): number {
  return a.name.localeCompare(b.name, "it");
}

/** Roster di una federazione, in ordine alfabetico. */
export async function listRoster(saveId: string): Promise<Wrestler[]> {
  const rows = await db.wrestlers.where("saveId").equals(saveId).toArray();
  return rows.sort(byName);
}

export async function getWrestler(id: string): Promise<Wrestler | undefined> {
  return db.wrestlers.get(id);
}

/**
 * Roster della federazione, generandolo alla prima apertura se manca:
 * rende retrocompatibili i salvataggi creati prima di C3.
 */
export async function ensureRoster(career: Career): Promise<Wrestler[]> {
  const existing = await listRoster(career.saveId);
  if (existing.length > 0) return existing;
  const generated = generateInitialRoster(career.seed, career.saveId, career.inGameDate);
  await db.wrestlers.bulkAdd(generated);
  return [...generated].sort(byName);
}

export async function updateWrestler(
  id: string,
  changes: Partial<Omit<Wrestler, "id" | "saveId">>
): Promise<void> {
  await db.wrestlers.update(id, changes);
}

export async function removeWrestler(id: string): Promise<void> {
  await db.wrestlers.delete(id);
}

/** Cancella tutto il roster di una federazione (con la federazione). */
export async function removeRoster(saveId: string): Promise<void> {
  await db.wrestlers.where("saveId").equals(saveId).delete();
}
