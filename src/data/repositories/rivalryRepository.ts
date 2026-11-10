import { db } from "../database";
import { createRivalry as buildRivalry } from "../../game/core/rivalry";
import type { Rivalry } from "../../game/types/rivalry";

// Persistenza delle rivalità (C4). La UI non tocca mai Dexie direttamente.

/** Id univoco per federazione: mai basato sui nomi (Documento Master §4). */
export function rivalryId(saveId: string): string {
  return `riv-${saveId.slice(0, 6)}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Rivalità di una federazione: le attive prima, poi per calore del pubblico. */
export async function listRivalries(saveId: string): Promise<Rivalry[]> {
  const rows = await db.rivalries.where("saveId").equals(saveId).toArray();
  return rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === "attiva" ? -1 : 1;
    return b.heat - a.heat || a.startedOn.localeCompare(b.startedOn);
  });
}

export async function addRivalry(rivalry: Rivalry): Promise<void> {
  await db.rivalries.add(rivalry);
}

export async function updateRivalry(rivalry: Rivalry): Promise<void> {
  await db.rivalries.put(rivalry);
}

export async function removeRivalry(id: string): Promise<void> {
  await db.rivalries.delete(id);
}

/** Crea una rivalità tra due atleti, se non ne hanno già una aperta. */
export async function createRivalry(
  saveId: string,
  participants: [string, string],
  today: string
): Promise<Rivalry> {
  const rivalry = buildRivalry(rivalryId(saveId), saveId, participants, today);
  await db.rivalries.add(rivalry);
  return rivalry;
}

/** Cancella tutte le rivalità di una federazione (con la federazione). */
export async function removeRivalries(saveId: string): Promise<void> {
  await db.rivalries.where("saveId").equals(saveId).delete();
}
