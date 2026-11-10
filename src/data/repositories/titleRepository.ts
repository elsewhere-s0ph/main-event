import { db } from "../database";
import type { Career } from "../../game/types/career";
import type { Championship, ChampionshipCategory } from "../../game/types/titles";
import { validateTitleInput, validateTitleName } from "../../game/core/titleSchema";
import {
  crownChampion as applyCrown,
  isEligible,
  vacateTitle as applyVacate,
} from "../../game/core/titles";

export interface TitleResult {
  title: Championship | null;
  error: string | null;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Id unici per federazione: il nome del titolo è unico dentro il salvataggio. */
function titleId(saveId: string, name: string): string {
  return `title-${saveId.slice(0, 6)}-${slugify(name)}`;
}

/** Titoli di default di una nuova federazione: rinominabili, non eliminabili. */
const DEFAULT_TITLES: ReadonlyArray<{
  name: string;
  category: ChampionshipCategory;
  prestige: number;
}> = [
  { name: "Campionato Mondiale", category: "world", prestige: 10 },
  { name: "Campionato Pesi Leggeri", category: "cruiserweight", prestige: 6 },
];

/** Titoli di una federazione, i più prestigiosi prima. */
export async function listTitles(saveId: string): Promise<Championship[]> {
  const rows = await db.championships.where("saveId").equals(saveId).toArray();
  return rows.sort(
    (a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name, "it")
  );
}

/**
 * Titoli della federazione, creati alla prima apertura se mancano:
 * rende retrocompatibili i salvataggi creati prima dei titoli.
 */
export async function ensureTitles(career: Career): Promise<Championship[]> {
  const existing = await listTitles(career.saveId);
  if (existing.length > 0) return existing;
  const created: Championship[] = DEFAULT_TITLES.map((t) => ({
    id: titleId(career.saveId, t.name),
    saveId: career.saveId,
    name: t.name,
    category: t.category,
    prestige: t.prestige,
    currentChampionId: null,
    reigns: [],
    createdAt: career.createdAt,
  }));
  await db.championships.bulkAdd(created);
  return created;
}

export async function createTitle(saveId: string, raw: unknown): Promise<TitleResult> {
  const parsed = validateTitleInput(raw);
  if (!parsed.ok) return { title: null, error: parsed.error };
  const career = await db.careers.get(saveId);
  if (!career) return { title: null, error: "Federazione non trovata" };

  const title: Championship = {
    id: titleId(saveId, parsed.value.name),
    saveId,
    name: parsed.value.name,
    category: parsed.value.category,
    prestige: parsed.value.category === "world" ? 10 : 6,
    currentChampionId: null,
    reigns: [],
    createdAt: new Date().toISOString(),
  };
  const clash = await db.championships.get(title.id);
  if (clash) return { title: null, error: "Esiste già un titolo con questo nome" };
  await db.championships.add(title);
  return { title, error: null };
}

export async function renameTitle(id: string, rawName: unknown): Promise<TitleResult> {
  const parsed = validateTitleName(rawName);
  if (!parsed.ok) return { title: null, error: parsed.error };
  const existing = await db.championships.get(id);
  if (!existing) return { title: null, error: "Titolo non trovato" };
  await db.championships.update(id, { name: parsed.value });
  return { title: { ...existing, name: parsed.value }, error: null };
}

/** Incorona un campione: il regno apre alla data di gioco corrente. */
export async function crownChampion(
  titleId: string,
  wrestlerId: string,
  today: string
): Promise<TitleResult> {
  const title = await db.championships.get(titleId);
  if (!title) return { title: null, error: "Titolo non trovato" };
  const wrestler = await db.wrestlers.get(wrestlerId);
  if (!wrestler) return { title: null, error: "Wrestler non trovato" };
  if (title.currentChampionId === wrestlerId) {
    return { title: null, error: `${wrestler.name} è già il campione in carica` };
  }
  if (!isEligible(title, wrestler)) {
    return {
      title: null,
      error: `${wrestler.name} non può concorrere per questo titolo di categoria`,
    };
  }
  const updated = applyCrown(title, wrestler, today);
  await db.championships.update(titleId, {
    currentChampionId: updated.currentChampionId,
    reigns: updated.reigns,
  });
  return { title: updated, error: null };
}

/** Rende vacante il titolo: il regno in corso finisce oggi. */
export async function vacateTitle(titleId: string, today: string): Promise<TitleResult> {
  const title = await db.championships.get(titleId);
  if (!title) return { title: null, error: "Titolo non trovato" };
  const updated = applyVacate(title, today);
  await db.championships.update(titleId, {
    currentChampionId: updated.currentChampionId,
    reigns: updated.reigns,
  });
  return { title: updated, error: null };
}

/** Salva lo stato aggiornato di un titolo (difese e cambi di titolo del booking). */
export async function saveTitle(title: Championship): Promise<void> {
  await db.championships.put(title);
}

/** Cancella tutti i titoli di una federazione (con la federazione). */
export async function removeTitles(saveId: string): Promise<void> {
  await db.championships.where("saveId").equals(saveId).delete();
}
