import { create } from "zustand";
import * as repo from "../data/repositories/careerRepository";
import * as rosterRepo from "../data/repositories/rosterRepository";
import * as titleRepo from "../data/repositories/titleRepository";
import type { TitleResult } from "../data/repositories/titleRepository";
import { validateWrestlerInput } from "../game/core/wrestlerSchema";
import { renewContract, RENEWAL_WEEKS } from "../game/core/contracts";
import type { Career } from "../game/types/career";
import type { Wrestler } from "../game/types/roster";
import type { Championship } from "../game/types/titles";

// Stato globale dell'interfaccia (Zustand). Non contiene lo stato della
// simulazione: quella vive nei motori di gioco (Documento Master §2).

export interface CareerResult {
  career: Career | null;
  error: string | null;
}

export interface WrestlerResult {
  wrestler: Wrestler | null;
  error: string | null;
}

interface CareerStore {
  careers: Career[];
  current: Career | null;
  roster: Wrestler[];
  titles: Championship[];
  selected: Wrestler | null;
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: { federationName: string; gmName: string; seed: string }) => Promise<CareerResult>;
  open: (saveId: string) => Promise<Career | null>;
  selectWrestler: (id: string | null) => void;
  saveWrestler: (id: string, raw: unknown) => Promise<WrestlerResult>;
  renewWrestler: (id: string, weeks: number) => Promise<WrestlerResult>;
  releaseWrestler: (id: string) => Promise<void>;
  addTitle: (raw: { name: string; category: string }) => Promise<TitleResult>;
  renameTitle: (id: string, rawName: unknown) => Promise<TitleResult>;
  crownWrestler: (titleId: string, wrestlerId: string) => Promise<TitleResult>;
  vacateTitle: (titleId: string) => Promise<TitleResult>;
  rename: (saveId: string, name: string) => Promise<CareerResult>;
  remove: (saveId: string) => Promise<void>;
}

export const useCareerStore = create<CareerStore>((set, get) => ({
  careers: [],
  current: null,
  roster: [],
  titles: [],
  selected: null,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    const careers = await repo.listCareers();
    set({ careers, loading: false });
  },

  create: async (input) => {
    const res = await repo.createCareer(input);
    if (!res.career) return res;
    set({ current: res.career });
    const roster = await rosterRepo.ensureRoster(res.career);
    const titles = await titleRepo.ensureTitles(res.career);
    set({ roster, titles, selected: null });
    await get().refresh();
    return { career: res.career, error: null };
  },

  open: async (saveId) => {
    const career = await repo.getCareer(saveId);
    if (!career || get().current?.saveId !== career.saveId) {
      set({ selected: null });
    }
    set({ current: career ?? null });
    if (!career) {
      set({ roster: [], titles: [] });
      return null;
    }
    const roster = await rosterRepo.ensureRoster(career);
    const titles = await titleRepo.ensureTitles(career);
    set({ roster, titles });
    return career;
  },

  selectWrestler: (id) => {
    if (!id) {
      set({ selected: null });
      return;
    }
    const wrestler = get().roster.find((w) => w.id === id) ?? null;
    set({ selected: wrestler });
  },

  saveWrestler: async (id, raw) => {
    const parsed = validateWrestlerInput(raw);
    if (!parsed.ok) return { wrestler: null, error: parsed.error };
    const existing = get().roster.find((w) => w.id === id);
    if (!existing) return { wrestler: null, error: "Wrestler non trovato" };

    await rosterRepo.updateWrestler(id, parsed.value);
    const updated: Wrestler = { ...existing, ...parsed.value };
    set({
      roster: get().roster.map((w) => (w.id === id ? updated : w)),
      selected: get().selected?.id === id ? updated : get().selected,
    });
    return { wrestler: updated, error: null };
  },

  renewWrestler: async (id, weeks) => {
    const career = get().current;
    const existing = get().roster.find((w) => w.id === id);
    if (!career || !existing) return { wrestler: null, error: "Wrestler non trovato" };
    if (!(RENEWAL_WEEKS as readonly number[]).includes(weeks)) {
      return { wrestler: null, error: "Durata del rinnovo non valida" };
    }
    const contract = renewContract(existing, career.inGameDate, weeks);
    await rosterRepo.updateWrestler(id, { contract });
    const updated: Wrestler = { ...existing, contract };
    set({
      roster: get().roster.map((w) => (w.id === id ? updated : w)),
      selected: get().selected?.id === id ? updated : get().selected,
    });
    return { wrestler: updated, error: null };
  },

  releaseWrestler: async (id) => {
    const existing = get().roster.find((w) => w.id === id);
    if (!existing) return;
    // Se era campione, i titoli che reggeva tornano vacanti: il regno resta nell'albo d'oro.
    const career = get().current;
    const today = career?.inGameDate ?? "2027-01-01";
    const heldTitles = get().titles.filter((t) => t.currentChampionId === id);
    const updatedTitles: Championship[] = [];
    for (const t of heldTitles) {
      const res = await titleRepo.vacateTitle(t.id, today);
      if (res.title) updatedTitles.push(res.title);
    }
    await rosterRepo.removeWrestler(id);
    set({
      roster: get().roster.filter((w) => w.id !== id),
      selected: get().selected?.id === id ? null : get().selected,
      titles:
        updatedTitles.length > 0
          ? get().titles.map((t) => updatedTitles.find((u) => u.id === t.id) ?? t)
          : get().titles,
    });
  },

  addTitle: async (raw) => {
    const career = get().current;
    if (!career) return { title: null, error: "Federazione non trovata" };
    const res = await titleRepo.createTitle(career.saveId, raw);
    if (res.title) set({ titles: [...get().titles, res.title] });
    return res;
  },

  renameTitle: async (id, rawName) => {
    const res = await titleRepo.renameTitle(id, rawName);
    if (res.title) {
      set({ titles: get().titles.map((t) => (t.id === id ? res.title! : t)) });
    }
    return res;
  },

  crownWrestler: async (titleId, wrestlerId) => {
    const career = get().current;
    if (!career) return { title: null, error: "Federazione non trovata" };
    const res = await titleRepo.crownChampion(titleId, wrestlerId, career.inGameDate);
    if (res.title) {
      set({ titles: get().titles.map((t) => (t.id === titleId ? res.title! : t)) });
    }
    return res;
  },

  vacateTitle: async (titleId) => {
    const career = get().current;
    if (!career) return { title: null, error: "Federazione non trovata" };
    const res = await titleRepo.vacateTitle(titleId, career.inGameDate);
    if (res.title) {
      set({ titles: get().titles.map((t) => (t.id === titleId ? res.title! : t)) });
    }
    return res;
  },

  rename: async (saveId, name) => {
    const res = await repo.renameFederation(saveId, name);
    const career = res.career;
    if (!career) return res;
    set({ current: career });
    set({ careers: get().careers.map((c) => (c.saveId === career.saveId ? career : c)) });
    return { career, error: null };
  },

  remove: async (saveId) => {
    await repo.deleteCareer(saveId);
    if (get().current?.saveId === saveId) {
      set({ current: null, roster: [], titles: [], selected: null });
    }
    await get().refresh();
  },
}));
