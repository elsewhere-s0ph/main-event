import { create } from "zustand";
import * as repo from "../data/repositories/careerRepository";
import type { Career } from "../game/types/career";

// Stato globale dell'interfaccia (Zustand). Non contiene lo stato della
// simulazione: quella vivrà nei motori di gioco (Documento Master §2).

export interface CareerResult {
  career: Career | null;
  error: string | null;
}

interface CareerStore {
  careers: Career[];
  current: Career | null;
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
    await get().refresh();
    return { career: res.career, error: null };
  },

  open: async (saveId) => {
    const career = await repo.getCareer(saveId);
    set({ current: career ?? null });
    return career ?? null;
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
    if (get().current?.saveId === saveId) set({ current: null });
    await get().refresh();
  },
}));
