import { describe, expect, it } from "vitest";
import {
  advanceRivalry,
  createRivalry,
  resolveRivalry,
  validateRivalryInput,
} from "./rivalry";

describe("validateRivalryInput", () => {
  it("accetta due atleti diversi", () => {
    expect(validateRivalryInput({ wrestlerIds: ["w1", "w2"] }).ok).toBe(true);
  });

  it("rifiuta un atleta contro se stesso", () => {
    expect(validateRivalryInput({ wrestlerIds: ["w1", "w1"] }).ok).toBe(false);
  });
});

describe("ciclo di vita", () => {
  it("nasce in fase inizio con intensità 3", () => {
    const r = createRivalry("riv-1", "save-1", ["w1", "w2"], "2027-01-04");
    expect(r.phase).toBe("inizio");
    expect(r.intensity).toBe(3);
    expect(r.status).toBe("attiva");
    expect(r.resolvedOn).toBeNull();
  });

  it("avanza di fase senza superare il culmine", () => {
    let r = createRivalry("riv-1", "save-1", ["w1", "w2"], "2027-01-04");
    r = advanceRivalry(r, 1, 1, 6, "episodio");
    expect(r.phase).toBe("provocazione");
    r = advanceRivalry(r, 99, 99, 0, "episodio");
    expect(r.phase).toBe("culmine");
    expect(r.intensity).toBe(10); // clamp
    expect(r.status).toBe("attiva");
  });

  it("si risolve con data e episodio", () => {
    let r = createRivalry("riv-1", "save-1", ["w1", "w2"], "2027-01-04");
    r = advanceRivalry(r, 4, 0, 0, "episodio");
    expect(r.phase).toBe("culmine");
    r = resolveRivalry(r, "2027-02-01", "fino alla fine");
    expect(r.status).toBe("risolta");
    expect(r.resolvedOn).toBe("2027-02-01");
    expect(r.story[r.story.length - 1]).toBe("fino alla fine");
  });

  it("ricorda al massimo 10 episodi", () => {
    let r = createRivalry("riv-1", "save-1", ["w1", "w2"], "2027-01-04");
    for (let i = 0; i < 15; i++) r = advanceRivalry(r, 0, 0, 0, `ep-${i}`);
    expect(r.story.length).toBe(10);
    expect(r.story[0]).toBe("ep-5");
  });
});
