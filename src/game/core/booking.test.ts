import { describe, expect, it } from "vitest";
import { nextOccurrence, nextShowDate, validateCard } from "./booking";
import type { WeeklyShow } from "../types/career";
import type { CardItem, MatchType } from "../types/booking";

const match = (id: string, type: MatchType, ids: string[], titleId: string | null = null): CardItem => ({
  kind: "match",
  data: { id, type, wrestlerIds: ids, titleId },
});

const segment = (id: string, kind: "promo", ids: string[]): CardItem => ({
  kind: "segment",
  data: { id, kind, wrestlerIds: ids },
});

describe("validateCard", () => {
  const base = { showId: "show-1", isSpecial: false, name: null, date: null };

  it("accetta una card valida", () => {
    const res = validateCard({
      ...base,
      items: [match("m1", "singolo", ["w1", "w2"]), segment("s1", "promo", ["w1", "w3"])],
    });
    expect(res.ok).toBe(true);
  });

  it("rifiuta una card vuota", () => {
    const res = validateCard({ ...base, items: [] });
    expect(res.ok).toBe(false);
  });

  it("rifiuta un match contro se stessi", () => {
    const res = validateCard({ ...base, items: [match("m1", "singolo", ["w1", "w1"])] });
    expect(res.ok).toBe(false);
  });

  it("rifiuta lo stesso atleta in due match", () => {
    const res = validateCard({
      ...base,
      items: [match("m1", "singolo", ["w1", "w2"]), match("m2", "singolo", ["w1", "w3"])],
    });
    expect(res.ok).toBe(false);
  });

  it("accetta lo stesso atleta in un match e in un segmento", () => {
    const res = validateCard({
      ...base,
      items: [match("m1", "singolo", ["w1", "w2"]), segment("s1", "promo", ["w1"])],
    });
    expect(res.ok).toBe(true);
  });

  it("rifiuta un segmento senza protagonisti", () => {
    const res = validateCard({ ...base, items: [segment("s1", "promo", [])] });
    expect(res.ok).toBe(false);
  });

  it("accetta un tag team completo", () => {
    const res = validateCard({ ...base, items: [match("m1", "tag", ["w1", "w2", "w3", "w4"])] });
    expect(res.ok).toBe(true);
  });

  it("rifiuta un tag team incompleto", () => {
    const res = validateCard({ ...base, items: [match("m1", "tag", ["w1", "w2", "w3"])] });
    expect(res.ok).toBe(false);
  });

  it("rifiuta un triple threat con un doppione", () => {
    const res = validateCard({ ...base, items: [match("m1", "triple", ["w1", "w2", "w2"])] });
    expect(res.ok).toBe(false);
  });

  it("rifiuta le scale senza titolo in palio", () => {
    const res = validateCard({ ...base, items: [match("m1", "ladder", ["w1", "w2"], null)] });
    expect(res.ok).toBe(false);
  });

  it("accetta le scale con un titolo in palio", () => {
    const res = validateCard({ ...base, items: [match("m1", "ladder", ["w1", "w2"], "t1")] });
    expect(res.ok).toBe(true);
  });

  it("accetta gabbia e hardcore come un singolo con stipulazione", () => {
    const res = validateCard({
      ...base,
      items: [match("m1", "cage", ["w1", "w2"]), match("m2", "hardcore", ["w3", "w4"])],
    });
    expect(res.ok).toBe(true);
  });
});

describe("calendario show", () => {
  it("trova la prossima data dello show (strictamente futura)", () => {
    // 2027-01-01 è venerdì.
    expect(nextOccurrence(1, "2027-01-01")).toBe("2027-01-04"); // lunedì
    expect(nextOccurrence(5, "2027-01-01")).toBe("2027-01-08"); // venerdì
    expect(nextOccurrence(7, "2027-01-01")).toBe("2027-01-03"); // domenica
  });

  it("sceglie lo show più vicino tra quelli settimanali", () => {
    const shows: WeeklyShow[] = [
      { id: "s-a", name: "Lunedì Night", day: 1 },
      { id: "s-b", name: "Domenica Main", day: 7 },
    ];
    const next = nextShowDate(shows, "2027-01-01");
    expect(next?.showId).toBe("s-b");
    expect(next?.date).toBe("2027-01-03");
  });

  it("avanza di una settimana a show già registrato", () => {
    expect(nextOccurrence(1, "2027-01-04")).toBe("2027-01-11");
  });

  it("restituisce null senza show", () => {
    expect(nextShowDate([], "2027-01-01")).toBeNull();
  });
});
