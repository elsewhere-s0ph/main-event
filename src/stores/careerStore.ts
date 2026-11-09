import { create } from "zustand";
import * as repo from "../data/repositories/careerRepository";
import * as rosterRepo from "../data/repositories/rosterRepository";
import type { Career } from "../game/types/career";
import type { Wrestler } from "../game/types/roster";

// Stato globale dell'interfaccia (Zustand). Non contiene lo stato della
// simulazione: quella vive nei motori di gioco (Documento Master §2).

export interface CareerResult {
  career: Career | null;
  error: string | null;
}

interface CareerStore {
  careers: Career[];
  current: Career | null;
  roster: Wrestler[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: { federationName: string; gmName: string; seed: string }) => Promise<CareerResult>;
  open: (saveId: string) => Promise<Career | null>;
  rename: (saveId: string, name: string) => Promise<CareerResult>;
  remove: (saveId: string) => Promise<void>;
}

export const useCareerStore = create<CareerStore>((set, get) => ({
  careers: [],
  current: null,
  roster: [],
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
    set({ roster });
    await get().refresh();
    return { career: res.career, error: null };
  },

  open: async (saveId) => {
    const career = await repo.getCareer(saveId);
    set({ current: career ?? null });
    if (!career) {
      set({ roster: [] });
      return null;
    }
    const roster = await rosterRepo.ensureRoster(career);
    set({ roster });
    return career;
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
    if (get().current?.saveId === saveId) set({ current: null, roster: [] });
    await get().refresh();
  },
}));
