import { describe, expect, it } from "vitest";
import { validateCareerInput } from "./careerSchema";

describe("validateCareerInput", () => {
  it("accetta un input valido e pulisce gli spazi", () => {
    const res = validateCareerInput({
      federationName: "  Frontier Wrestling  ",
      gmName: "Flynn",
      seed: "torneo-2027",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.federationName).toBe("Frontier Wrestling");
      expect(res.value.gmName).toBe("Flynn");
      expect(res.value.seed).toBe("torneo-2027");
    }
  });

  it("rifiuta un nome federazione troppo corto", () => {
    const res = validateCareerInput({ federationName: "A", gmName: "Flynn", seed: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("almeno 2");
    }
  });

  it("rifiuta un nome GM mancante", () => {
    const res = validateCareerInput({ federationName: "Frontier", gmName: "F", seed: "" });
    expect(res.ok).toBe(false);
  });

  it("accetta seed vuoto (verrà generato un seed casuale)", () => {
    const res = validateCareerInput({ federationName: "Frontier", gmName: "Flynn", seed: "" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.seed).toBe("");
    }
  });

  it("rifiuta input che non sono un oggetto", () => {
    const res = validateCareerInput("non sono un oggetto");
    expect(res.ok).toBe(false);
  });
});
