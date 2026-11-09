import { describe, expect, it } from "vitest";
import { validateWrestlerInput } from "./wrestlerSchema";

const valid = {
  name: "Vespa",
  nickname: "Il fulmine dei quartieri",
  gimmick: "Veloce, fastidioso, inossidabile.",
  bodyType: "cruiserweight",
  alignment: "face",
  stats: { power: 4, agility: 8, stamina: 6, charisma: 9 },
  signature: "Girata di Fianco",
  finisher: "Pungiglione",
  colors: { trim: "#ef6b6b", skin: "#e8c39e" },
};

describe("validateWrestlerInput", () => {
  it("accetta una scheda valida e pulisce gli spazi", () => {
    const res = validateWrestlerInput({ ...valid, name: "  Vespa  " });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.name).toBe("Vespa");
      expect(res.value.stats.power).toBe(4);
    }
  });

  it("normalizza i colori in minuscolo", () => {
    const res = validateWrestlerInput({
      ...valid,
      colors: { trim: "#EF6B6B", skin: "#E8C39E" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.colors.trim).toBe("#ef6b6b");
      expect(res.value.colors.skin).toBe("#e8c39e");
    }
  });

  it("rifiuta un nome troppo corto", () => {
    const res = validateWrestlerInput({ ...valid, name: "V" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("almeno 2");
    }
  });

  it("rifiuta attributi fuori range o non interi", () => {
    expect(
      validateWrestlerInput({ ...valid, stats: { ...valid.stats, power: 0 } }).ok
    ).toBe(false);
    expect(
      validateWrestlerInput({ ...valid, stats: { ...valid.stats, power: 11 } }).ok
    ).toBe(false);
    expect(
      validateWrestlerInput({ ...valid, stats: { ...valid.stats, charisma: 4.5 } }).ok
    ).toBe(false);
  });

  it("rifiuta colori malformati", () => {
    expect(
      validateWrestlerInput({ ...valid, colors: { trim: "#fff", skin: "#e8c39e" } }).ok
    ).toBe(false);
    expect(
      validateWrestlerInput({ ...valid, colors: { trim: "ef6b6b", skin: "#e8c39e" } }).ok
    ).toBe(false);
  });

  it("rifiuta fazione o categoria non valide", () => {
    expect(validateWrestlerInput({ ...valid, alignment: "tweener" }).ok).toBe(false);
    expect(validateWrestlerInput({ ...valid, bodyType: "luchador" }).ok).toBe(false);
  });

  it("rifiuta input che non è un oggetto", () => {
    expect(validateWrestlerInput(42).ok).toBe(false);
    expect(validateWrestlerInput(null).ok).toBe(false);
  });
});
