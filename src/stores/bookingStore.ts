import { create } from "zustand";
import * as bookingRepo from "../data/repositories/bookingRepository";
import * as rivalryRepo from "../data/repositories/rivalryRepository";
import * as titleRepo from "../data/repositories/titleRepository";
import * as careerRepo from "../data/repositories/careerRepository";
import { nextShowDate, validateCard } from "../game/core/booking";
import { runShow, runnableIssues } from "../game/core/showRunner";
import { resolveRivalry as closeRivalry } from "../game/core/rivalry";
import { applyShowFinance, showFinanceBreakdown, STARTING_BALANCE } from "../game/core/economy";
import { USER_REPUTATION, userViewers } from "../game/core/world";
import { useCareerStore } from "./careerStore";
import type { CardItem, ShowCard, ShowResult } from "../game/types/booking";
import type { Rivalry } from "../game/types/rivalry";
import type { Career, CareerFinance } from "../game/types/career";

// Stato del booking (C4): card degli show, rivalità e risultati registrati.
// Le operazioni passano sempre dai repository: la UI non tocca il database.

export interface OpResult {
  ok: boolean;
  error: string | null;
}

interface BookingStore {
  cards: Record<string, ShowCard>;
  results: ShowResult[];
  rivalries: Rivalry[];
  loading: boolean;
  load: (saveId: string) => Promise<void>;
  saveCard: (showId: string, items: CardItem[]) => Promise<OpResult>;
  createSpecial: (name: string, date: string) => Promise<OpResult>;
  deleteSpecial: (showId: string) => Promise<void>;
  runWeeklyShow: (showId: string) => Promise<OpResult>;
  runSpecial: (showId: string) => Promise<OpResult>;
  createRivalry: (aId: string, bId: string) => Promise<OpResult>;
  resolveRivalry: (id: string) => Promise<void>;
}

function omitCard(cards: Record<string, ShowCard>, showId: string): Record<string, ShowCard> {
  const next = { ...cards };
  delete next[showId];
  return next;
}

export const useBookingStore = create<BookingStore>((set, get) => {
  /** Pipeline condivisa: registra lo show, persiste esiti e fa avanzare il tempo. */
  async function runAndPersist(
    career: Career,
    showName: string,
    date: string,
    showId: string,
    isSpecial: boolean
  ): Promise<OpResult> {
    const state = get();
    const card = state.cards[showId];
    if (!card || card.items.length === 0) {
      return { ok: false, error: "Prima scrivi la card dello show" };
    }
    const careerState = useCareerStore.getState();
    const issues = runnableIssues(card.items, careerState.roster, careerState.titles);
    if (issues.length > 0) {
      return { ok: false, error: issues[0] };
    }

    const output = runShow({
      items: card.items,
      roster: careerState.roster,
      titles: careerState.titles,
      rivalries: state.rivalries,
      saveId: career.saveId,
      showId,
      showName,
      date,
      seed: career.seed,
      isSpecial,
    });
    const result: ShowResult = { ...output.result, createdAt: new Date().toISOString() };

    await bookingRepo.addShowResult(result);
    for (const r of output.rivalries) await rivalryRepo.updateRivalry(r);
    for (const t of output.titles) await titleRepo.saveTitle(t);
    if (isSpecial) await bookingRepo.deleteCard(card.id);

    // Economia (C5): il conto dello show entra nel registro della federazione.
    const viewers = userViewers(result.rating, isSpecial, USER_REPUTATION);
    const weeklyPayroll = careerState.roster.reduce((sum, w) => sum + w.contract.weeklyPay, 0);
    const breakdown = showFinanceBreakdown({
      rating: result.rating,
      isSpecial,
      viewers,
      showName,
      date,
      weeklyPayroll,
    });
    const finance: CareerFinance = applyShowFinance(
      career.finance ?? { balance: STARTING_BALANCE, transactions: [] },
      breakdown
    );

    // Il tempo avanza alla data dello show e non torna indietro.
    const updatedCareer = await careerRepo.updateInGameDate(career.saveId, date);
    const withFinance = await careerRepo.updateFinance(career.saveId, finance);

    const mergedRivalries = state.rivalries.map(
      (r) => output.rivalries.find((u) => u.id === r.id) ?? r
    );
    const mergedTitles = careerState.titles.map(
      (t) => output.titles.find((u) => u.id === t.id) ?? t
    );
    set({
      rivalries: mergedRivalries,
      results: [result, ...state.results].slice(0, 40),
      cards: isSpecial ? omitCard(state.cards, showId) : state.cards,
    });
    useCareerStore.setState({
      current: withFinance ?? updatedCareer ?? career,
      titles: mergedTitles,
    });
    return { ok: true, error: null };
  }

  return {
    cards: {},
    results: [],
    rivalries: [],
    loading: false,

    load: async (saveId) => {
      set({ loading: true });
      const [cards, results, rivalries] = await Promise.all([
        bookingRepo.listCards(saveId),
        bookingRepo.listShowResults(saveId, 40),
        rivalryRepo.listRivalries(saveId),
      ]);
      const byShow: Record<string, ShowCard> = {};
      for (const c of cards) byShow[c.showId] = c;
      set({ cards: byShow, results, rivalries, loading: false });
    },

    saveCard: async (showId, items) => {
      const career = useCareerStore.getState().current;
      const existing = get().cards[showId];
      if (!career) return { ok: false, error: "Federazione non trovata" };
      const validation = validateCard({
        showId,
        isSpecial: existing?.isSpecial ?? false,
        name: existing?.name ?? null,
        date: existing?.date ?? null,
        items,
      });
      if (!validation.ok) return { ok: false, error: validation.error };
      const card: ShowCard = {
        id: bookingRepo.cardId(career.saveId, showId),
        saveId: career.saveId,
        showId,
        isSpecial: existing?.isSpecial ?? false,
        name: existing?.name ?? null,
        date: existing?.date ?? null,
        items: validation.value.items,
        updatedAt: new Date().toISOString(),
      };
      await bookingRepo.saveCard(card);
      set({ cards: { ...get().cards, [showId]: card } });
      return { ok: true, error: null };
    },

    createSpecial: async (name, date) => {
      const career = useCareerStore.getState().current;
      if (!career) return { ok: false, error: "Federazione non trovata" };
      const trimmed = name.trim();
      if (trimmed.length < 2 || trimmed.length > 40) {
        return { ok: false, error: "Il nome dell'evento deve avere da 2 a 40 caratteri" };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { ok: false, error: "Data non valida" };
      }
      if (date < career.inGameDate) {
        return { ok: false, error: "L'evento non può essere nel passato" };
      }
      const showId = `special-${crypto.randomUUID().slice(0, 8)}`;
      const card: ShowCard = {
        id: bookingRepo.cardId(career.saveId, showId),
        saveId: career.saveId,
        showId,
        isSpecial: true,
        name: trimmed,
        date,
        items: [],
        updatedAt: new Date().toISOString(),
      };
      await bookingRepo.saveCard(card);
      set({ cards: { ...get().cards, [showId]: card } });
      return { ok: true, error: null };
    },

    deleteSpecial: async (showId) => {
      const card = get().cards[showId];
      if (!card || !card.isSpecial) return;
      await bookingRepo.deleteCard(card.id);
      set({ cards: omitCard(get().cards, showId) });
    },

    runWeeklyShow: async (showId) => {
      const career = useCareerStore.getState().current;
      if (!career) return { ok: false, error: "Federazione non trovata" };
      const show = (career.shows ?? []).find((s) => s.id === showId);
      if (!show) return { ok: false, error: "Show non trovato" };
      const upcoming = nextShowDate([show], career.inGameDate);
      if (!upcoming) return { ok: false, error: "Show senza giorno in calendario" };
      return runAndPersist(career, show.name, upcoming.date, showId, false);
    },

    runSpecial: async (showId) => {
      const career = useCareerStore.getState().current;
      const card = get().cards[showId];
      if (!career) return { ok: false, error: "Federazione non trovata" };
      if (!card || !card.isSpecial || !card.date) {
        return { ok: false, error: "Evento speciale non trovato" };
      }
      if (card.date < career.inGameDate) {
        return { ok: false, error: "L'evento è nel passato: il tempo non torna indietro" };
      }
      return runAndPersist(career, card.name ?? "Evento speciale", card.date, showId, true);
    },

    createRivalry: async (aId, bId) => {
      const career = useCareerStore.getState().current;
      if (!career) return { ok: false, error: "Federazione non trovata" };
      if (!aId || !bId) return { ok: false, error: "Scegli i due avversari" };
      if (aId === bId) return { ok: false, error: "Una rivalità ha bisogno di due atleti diversi" };
      const clash = get().rivalries.find(
        (r) =>
          r.status === "attiva" &&
          ((r.participants[0] === aId && r.participants[1] === bId) ||
            (r.participants[0] === bId && r.participants[1] === aId))
      );
      if (clash) return { ok: false, error: "Questi due hanno già una storia aperta" };
      const rivalry = await rivalryRepo.createRivalry(
        career.saveId,
        [aId, bId],
        career.inGameDate
      );
      set({ rivalries: [rivalry, ...get().rivalries] });
      return { ok: true, error: null };
    },

    resolveRivalry: async (id) => {
      const career = useCareerStore.getState().current;
      const existing = get().rivalries.find((r) => r.id === id);
      if (!career || !existing) return;
      const updated = closeRivalry(
        existing,
        career.inGameDate,
        "La storia si chiude fuori dal ring, con un patto tra professionisti."
      );
      await rivalryRepo.updateRivalry(updated);
      set({ rivalries: get().rivalries.map((r) => (r.id === id ? updated : r)) });
    },
  };
});

