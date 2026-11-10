import { db } from "../database";
import { SCHEMA_VERSION, type Career, type CareerFinance } from "../../game/types/career";
import { federationNameSchema, validateCareerInput } from "../../game/core/careerSchema";
import { defaultIdentity, validateIdentity } from "../../game/core/federation";
import { STARTING_BALANCE } from "../../game/core/economy";
import { removeRoster } from "./rosterRepository";
import { removeTitles } from "./titleRepository";
import { removeBookingData } from "./bookingRepository";
import { removeRivalries } from "./rivalryRepository";
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
  const career = await db.careers.get(saveId);
  if (!career) return undefined;
  return ensureIdentity(career);
}

/**
 * Migrazione lazy a schema 3: riempie l'identità (colori, filosofia, show, logo)
 * delle federazioni create prima del C3 e l'economia (bilancio di partenza)
 * di quelle create prima del C5. Nessun dato esistente viene toccato.
 */
export async function ensureIdentity(career: Career): Promise<Career> {
  if (
    career.schemaVersion >= SCHEMA_VERSION &&
    career.colors &&
    career.philosophy &&
    career.shows &&
    career.shows.length > 0 &&
    career.finance
  ) {
    return career;
  }
  const defaults = defaultIdentity();
  const patched: Career = {
    ...career,
    colors: career.colors ?? defaults.colors,
    philosophy: career.philosophy ?? defaults.philosophy,
    shows: career.shows && career.shows.length > 0 ? career.shows : defaults.shows,
    logo: career.logo ?? null,
    finance: career.finance ?? { balance: STARTING_BALANCE, transactions: [] },
    schemaVersion: SCHEMA_VERSION,
  };
  await db.careers.put(patched);
  return patched;
}

export async function createCareer(raw: unknown, identity?: unknown): Promise<CareerResult> {
  const parsed = validateCareerInput(raw);
  if (!parsed.ok) return { career: null, error: parsed.error };

  let identityValue = defaultIdentity();
  if (identity !== undefined) {
    const v = validateIdentity(identity);
    if (!v.ok) return { career: null, error: v.error };
    identityValue = {
      colors: v.value.colors,
      philosophy: v.value.philosophy,
      shows: v.value.shows.map((s, i) => ({ id: `show-${i + 1}`, name: s.name, day: s.day })),
      logo: v.value.logo ?? null,
    };
  }

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
    colors: identityValue.colors,
    philosophy: identityValue.philosophy,
    shows: identityValue.shows,
    logo: identityValue.logo,
    finance: { balance: STARTING_BALANCE, transactions: [] },
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

/** Aggiorna l'identità della federazione: colori, filosofia, show settimanali e logo. */
export async function updateIdentity(saveId: string, raw: unknown): Promise<CareerResult> {
  const existing = await db.careers.get(saveId);
  if (!existing) return { career: null, error: "Federazione non trovata" };
  const v = validateIdentity(raw);
  if (!v.ok) return { career: null, error: v.error };

  const now = new Date().toISOString();
  await db.careers.update(saveId, {
    colors: v.value.colors,
    philosophy: v.value.philosophy,
    shows: v.value.shows.map((s, i) => ({
      id: existing.shows?.[i]?.id ?? `show-${i + 1}`,
      name: s.name,
      day: s.day,
    })),
    logo: v.value.logo ?? null,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now,
  });
  const career = await db.careers.get(saveId);
  return career ? { career, error: null } : { career: null, error: "Federazione non trovata" };
}

/** Cancella la federazione con roster, titoli, booking e rivalità. */
export async function deleteCareer(saveId: string): Promise<void> {
  await removeRoster(saveId);
  await removeTitles(saveId);
  await removeBookingData(saveId);
  await removeRivalries(saveId);
  await db.careers.delete(saveId);
}

/**
 * Avanza la data di gioco (C4): ogni show registrato porta il tempo alla
 * propria data. Il tempo non torna mai indietro.
 */
export async function updateInGameDate(saveId: string, date: string): Promise<Career | null> {
  const existing = await db.careers.get(saveId);
  if (!existing) return null;
  if (date <= existing.inGameDate) return existing;
  const now = new Date().toISOString();
  await db.careers.update(saveId, { inGameDate: date, updatedAt: now });
  return (await db.careers.get(saveId)) ?? null;
}

/**
 * Aggiorna il bilancio della federazione (C5): il registro delle transazioni
 * viaggia sempre insieme al saldo. Mai un numero modificato a mano.
 */
export async function updateFinance(
  saveId: string,
  finance: CareerFinance
): Promise<Career | null> {
  const existing = await db.careers.get(saveId);
  if (!existing) return null;
  const now = new Date().toISOString();
  await db.careers.update(saveId, { finance, updatedAt: now });
  return (await db.careers.get(saveId)) ?? null;
}

