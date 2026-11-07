import { db } from "../database";
import { SCHEMA_VERSION, type Career } from "../../game/types/career";
import { federationNameSchema, validateCareerInput } from "../../game/core/careerSchema";
import pkg from "../../../package.json";

export type CareerResult = { career: Career | null; error: string | null };

/** Seed casuale corto e condivisibile (8 caratteri esadecimali). */
function randomSeed(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Elenco delle partite salvate, la più recente prima. */
export async function listCareers(): Promise<Career[]> {
  return db.careers.orderBy("updatedAt").reverse().toArray();
}

export async function getCareer(saveId: string): Promise<Career | undefined> {
  return db.careers.get(saveId);
}

export async function createCareer(raw: unknown): Promise<CareerResult> {
  const parsed = validateCareerInput(raw);
  if (!parsed.ok) return { career: null, error: parsed.error };

  const now = new Date().toISOString();
  const seed = parsed.value.seed.length > 0 ? parsed.value.seed : randomSeed();

  const career: Career = {
    saveId: crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    gameVersion: pkg.version,
    federationName: parsed.value.federationName,
    gmName: parsed.value.gmName,
    seed,
    inGameDate: "2027-01-01",
    createdAt: now,
    updatedAt: now,
  };

  await db.careers.add(career);
  return { career, error: null };
}

/** Rinomina la federazione e aggiorna il timestamp di salvataggio. */
export async function renameFederation(saveId: string, rawName: unknown): Promise<CareerResult> {
  const parsed = federationNameSchema.safeParse(rawName);
  if (!parsed.success) {
    return { career: null, error: parsed.error.issues[0]?.message ?? "Nome non valido" };
  }
  const existing = await db.careers.get(saveId);
  if (!existing) return { career: null, error: "Federazione non trovata" };

  const now = new Date().toISOString();
  await db.careers.update(saveId, { federationName: parsed.data, updatedAt: now });
  const career = await db.careers.get(saveId);
  return career ? { career, error: null } : { career: null, error: "Federazione non trovata" };
}

export async function deleteCareer(saveId: string): Promise<void> {
  await db.careers.delete(saveId);
}
