import { describe, expect, it } from "vitest";
import { runShow, runnableIssues } from "./showRunner";
import { createRivalry, advanceRivalry } from "./rivalry";
import type { Wrestler } from "../types/roster";
import type { Championship } from "../types/titles";
import type { CardItem } from "../types/booking";

function wrestler(id: string, name: string, charisma: number): Wrestler {
  return {
    id,
    saveId: "save-1",
    name,
    nickname: "",
    gimmick: "",
    bodyType: "heavyweight",
    alignment: "face",
    stats: { power: 8, agility: 4, stamina: 6, charisma },
    signature: "",
    finisher: "Finisher",
    colors: { trim: "#8b5cf6", skin: "#d9b08c" },
    contract: { weeklyPay: 400, signedOn: "2027-01-01", expiresOn: "2027-12-31" },
  };
}

function title(id: string, championId: string | null): Championship {
  return {
    id,
    saveId: "save-1",
    name: id,
    category: "world",
    prestige: 10,
    currentChampionId: championId,
    reigns: championId
      ? [{ championId, championName: championId, wonOn: "2027-01-01", lostOn: null, defenses: 0 }]
      : [],
    createdAt: "2027-01-01",
  };
}

const roster = [
  wrestler("w1", "Alfa", 8),
  wrestler("w2", "Bravo", 6),
  wrestler("w3", "Charlie", 4),
  wrestler("w4", "Delta", 5),
];

const card: CardItem[] = [
  { kind: "segment", data: { id: "s1", kind: "promo", wrestlerIds: ["w1"] } },
  { kind: "match", data: { id: "m1", type: "singolo", wrestlerIds: ["w1", "w2"], titleId: null } },
  { kind: "match", data: { id: "m2", type: "singolo", wrestlerIds: ["w2", "w3"], titleId: "t1" } },
];

const baseInput = {
  items: card,
  roster,
  titles: [title("t1", "w2")],
  rivalries: [],
  saveId: "save-1",
  showId: "show-1",
  showName: "Lunedì Night",
  date: "2027-01-04",
  seed: "SEED01",
  isSpecial: false,
};

describe("runShow", () => {
  it("è deterministico: stesso input, stesso show", () => {
    const a = runShow(baseInput);
    const b = runShow(baseInput);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produce un esito per ogni voce della card", () => {
    const { result } = runShow(baseInput);
    expect(result.outcomes.length).toBe(3);
    expect(result.outcomes[0].kind).toBe("segment");
    expect(result.outcomes[1].kind).toBe("match");
  });

  it("ogni match ha un vincitore tra i partecipanti", () => {
    const { result } = runShow(baseInput);
    for (const o of result.outcomes) {
      if (o.kind !== "match") continue;
      const [a, b] = o.match.wrestlerIds;
      expect([a, b]).toContain(o.winnerId);
      expect([a, b]).toContain(o.loserId);
      expect(o.winnerId).not.toBe(o.loserId);
    }
  });

  it("il titolo cambia di mani solo se il campione perde", () => {
    const { result, titles } = runShow(baseInput);
    const outcome = result.outcomes.find(
      (o) => o.kind === "match" && o.match.id === "m2"
    );
    if (!outcome || outcome.kind !== "match") return;
    const updated = titles.find((t) => t.id === "t1");
    expect(updated).toBeDefined();
    if (outcome.titleChange) {
      expect(updated?.currentChampionId).toBe(outcome.titleChange.newChampionId);
      expect(outcome.defense).toBe(false);
    } else {
      expect(outcome.defense).toBe(true);
      expect(updated?.currentChampionId).toBe("w2");
    }
  });

  it("una difesa riuscita incrementa le difese del regno", () => {
    // w2 (campione) contro w3: forziamo il match con il campione vincente
    // provando abbastanza seed? No: deterministico. Usiamo il regno del
    // vincitore qualunque sia: se w2 vince, defenses = 1.
    const { result, titles } = runShow(baseInput);
    const outcome = result.outcomes.find((o) => o.kind === "match" && o.match.id === "m2");
    if (!outcome || outcome.kind !== "match" || !outcome.defense) return;
    const updated = titles.find((t) => t.id === "t1");
    expect(updated?.reigns[updated.reigns.length - 1].defenses).toBe(1);
  });

  it("una rivalità al culmine si chiude sul ring", () => {
    let riv = createRivalry("riv-1", "save-1", ["w1", "w2"], "2027-01-01");
    riv = advanceRivalry(riv, 4, 0, 0, "escalation completa");
    const { result, rivalries } = runShow({ ...baseInput, rivalries: [riv] });
    const match1 = result.outcomes.find((o) => o.kind === "match" && o.match.id === "m1");
    expect(match1).toBeDefined();
    const updated = rivalries.find((r) => r.id === "riv-1");
    expect(updated?.status).toBe("risolta");
    expect(updated?.resolvedOn).toBe("2027-01-04");
  });

  it("una rivalità giovane avanza di fase dopo il match", () => {
    const riv = createRivalry("riv-1", "save-1", ["w1", "w2"], "2027-01-01");
    const { rivalries } = runShow({ ...baseInput, rivalries: [riv] });
    const updated = rivalries.find((r) => r.id === "riv-1");
    expect(updated?.phase).toBe("provocazione");
    expect(updated?.status).toBe("attiva");
  });

  it("una rivalità tra i due avversari di un match avanza di fase", () => {
    const riv = createRivalry("riv-1", "save-1", ["w2", "w3"], "2027-01-01");
    const { rivalries } = runShow({ ...baseInput, rivalries: [riv] });
    const updated = rivalries.find((r) => r.id === "riv-1");
    // w2 e w3 sono insieme nel match m2, non nel segmento: il match fa avanzare.
    expect(updated?.phase).toBe("provocazione");
  });

  it("valutazione e verdetto sono coerenti", () => {
    const { result } = runShow(baseInput);
    expect(result.rating).toBeGreaterThanOrEqual(5);
    expect(result.rating).toBeLessThanOrEqual(99);
    expect(result.verdict.length).toBeGreaterThan(0);
  });
});

describe("runnableIssues", () => {
  it("segnala un titolo in palio senza il campione nel match", () => {
    const items: CardItem[] = [
      { kind: "match", data: { id: "m1", type: "singolo", wrestlerIds: ["w1", "w3"], titleId: "t1" } },
    ];
    const issues = runnableIssues(items, roster, [title("t1", "w2")]);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain("t1");
  });

  it("non segnala nulla su una card coerente", () => {
    const items: CardItem[] = [
      { kind: "match", data: { id: "m1", type: "singolo", wrestlerIds: ["w1", "w2"], titleId: "t1" } },
    ];
    expect(runnableIssues(items, roster, [title("t1", "w1")])).toEqual([]);
  });

  it("segnala atleti fuori roster", () => {
    const items: CardItem[] = [
      { kind: "match", data: { id: "m1", type: "singolo", wrestlerIds: ["w1", "ghost"], titleId: null } },
    ];
    expect(runnableIssues(items, roster, []).length).toBe(1);
  });

  it("segnala un tag team incompleto e le scale senza titolo", () => {
    const items: CardItem[] = [
      { kind: "match", data: { id: "m1", type: "tag", wrestlerIds: ["w1", "w2", "w3"], titleId: null } },
      { kind: "match", data: { id: "m2", type: "ladder", wrestlerIds: ["w1", "w2"], titleId: null } },
    ];
    expect(runnableIssues(items, roster, []).length).toBe(2);
  });
});

describe("match avanzati (C6)", () => {
  const cardMulti: CardItem[] = [
    { kind: "match", data: { id: "m1", type: "tag", wrestlerIds: ["w1", "w2", "w3", "w4"], titleId: null } },
    { kind: "match", data: { id: "m2", type: "triple", wrestlerIds: ["w1", "w2", "w3"], titleId: null } },
    { kind: "match", data: { id: "m3", type: "cage", wrestlerIds: ["w2", "w4"], titleId: null } },
  ];
  const multiInput = { ...baseInput, items: cardMulti };

  it("è deterministico anche con match avanzati", () => {
    const a = runShow(multiInput);
    const b = runShow(multiInput);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("il tag team ha vincitore e sconfitto tra i quattro", () => {
    const { result } = runShow(multiInput);
    const o = result.outcomes.find((x) => x.kind === "match" && x.match.id === "m1");
    if (!o || o.kind !== "match") return;
    expect(["w1", "w2", "w3", "w4"]).toContain(o.winnerId);
    expect(["w1", "w2", "w3", "w4"]).toContain(o.loserId);
    expect(o.summary).toContain("Tag team");
  });

  it("il triple threat produce un esito con valutazione nei limiti", () => {
    const { result } = runShow(multiInput);
    const o = result.outcomes.find((x) => x.kind === "match" && x.match.id === "m2");
    if (!o || o.kind !== "match") return;
    expect(o.rating).toBeGreaterThanOrEqual(5);
    expect(o.rating).toBeLessThanOrEqual(99);
  });

  it("la gabbia aggiunge flavor alla cronaca", () => {
    const { result } = runShow(multiInput);
    const o = result.outcomes.find((x) => x.kind === "match" && x.match.id === "m3");
    if (!o || o.kind !== "match") return;
    expect(o.summary.length).toBeGreaterThan(20);
  });

  it("le scale con titolo in palio seguono le regole del titolo", () => {
    const items: CardItem[] = [
      { kind: "match", data: { id: "m1", type: "ladder", wrestlerIds: ["w2", "w3"], titleId: "t1" } },
    ];
    const { result, titles } = runShow({ ...baseInput, items });
    const o = result.outcomes.find((x) => x.kind === "match");
    if (!o || o.kind !== "match") return;
    const updated = titles.find((t) => t.id === "t1");
    expect(updated).toBeDefined();
    if (o.titleChange) {
      expect(updated?.currentChampionId).toBe(o.titleChange.newChampionId);
    } else {
      expect(o.defense).toBe(true);
    }
  });
});
