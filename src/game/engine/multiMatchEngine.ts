import { mulberry32, seedFromString } from "../core/rng";
import { DUR, FINISHER_MOVE_ID, MOVES, clampEnergy, pick } from "./matchEngine";
import type { EventKind, MatchEvent, MatchResult, WrestlerDef } from "../types/match";

// Motore dei match a più atleti (v0.11.0): tag team, triple threat e
// fatal 4-way. Stessa filosofia del motore 1v1: puro, deterministico
// (mulberry32 seminato con seedFromString), timeline di eventi accoppiata
// al renderer. Il motore 1v1 resta intoccato: qui il ring è più affollato,
// non diverso. Gabbia, scale e hardcore restano 1v1 (matchTypes.ts).

export type MultiKind = "tag" | "triple" | "fatal4";

const MULTI_MAX_TURNS = 26;
const MULTI_ENTRANCE_MS = 1000;

export function simulateMultiMatch(
  wrestlers: readonly WrestlerDef[],
  seed: string,
  type: MultiKind
): MatchResult {
  const rng = mulberry32(seedFromString("match:" + seed));
  const n = wrestlers.length;
  const energy: number[] = wrestlers.map(() => 100);
  const events: MatchEvent[] = [];
  let t = 0;
  let nextId = 0;

  const push = (
    kind: EventKind,
    actor: number,
    target: number | undefined,
    moveName: string,
    damage: number,
    durMs: number,
    text: string,
    gap: number = DUR.gap,
    moveId?: string,
    impactMs?: number
  ): void => {
    events.push({
      id: nextId++,
      t: Math.round(t),
      durMs,
      kind,
      actor,
      ...(target === undefined ? {} : { target }),
      moveName,
      damage,
      text,
      ...(moveId ? { moveId } : {}),
      ...(impactMs ? { impactMs } : {}),
      energyAfter: energy.map((e) => e),
    });
    t += durMs + gap;
  };

  // Squadre: nel tag i primi due della card sono la squadra 1 (come da booking).
  const teams: number[][] =
    type === "tag" ? [[0, 1], [2, 3]] : wrestlers.map((_, i) => [i]);
  const teamOf = (i: number): number => (type === "tag" ? (i < 2 ? 0 : 1) : i);
  const active: number[] = teams.map((tm) => tm[0]);

  const finalize = (winner: number, loser: number): MatchResult => {
    const w = wrestlers[winner];
    const seconds = Math.round(t / 1000);
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, "0");
    const label = type === "triple" ? "triple threat" : type === "fatal4" ? "fatal 4-way" : "tag team";
    const summary =
      type === "tag"
        ? "Tag team: " +
          teams[teamOf(winner)].map((i) => wrestlers[i].name).join(" e ") +
          " battono " +
          teams[teamOf(loser)].map((i) => wrestlers[i].name).join(" e ") +
          " in " + mm + ":" + ss + ". " + w.finisher + " ha chiuso i conti."
        : w.name +
          " sopravvive al " + label + " in " + mm + ":" + ss + ". " +
          w.finisher + " ha chiuso i conti.";
    return {
      seed,
      wrestlers,
      winner,
      loser,
      events,
      durationMs: Math.round(t),
      finalEnergy: energy.map((e) => e),
      summary,
    };
  };

  for (let i = 0; i < n; i++) {
    const w = wrestlers[i];
    push("entrance", i, undefined, "", 0, MULTI_ENTRANCE_MS, w.name + " entra sul ring: " + w.nickname + ".", 120);
  }
  push("approach", 0, undefined, "", 0, DUR.approach, "Tutti al centro: ci si studia e si scelgono i bersagli.");

  let actor = active[rng() < 0.5 ? 0 : 1];
  let turns = 0;

  const others = (me: number): number[] => {
    if (type === "tag") return [active[teamOf(me) === 0 ? 1 : 0]];
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (i !== me) out.push(i);
    return out;
  };
  const helpers = (me: number, victim: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (i !== me && i !== victim && energy[i] > 35) out.push(i);
    return out;
  };

  // Copertura interrotta: o un aiutante arriva dall'angolo (e chi copre
  // paga il prezzo), o la vittima si libera da sola e riparte.
  const breakupOrKickout = (coverer: number, victim: number): void => {
    const hs = helpers(coverer, victim);
    if (hs.length > 0 && rng() < 0.35) {
      const helper = hs[Math.floor(rng() * hs.length)];
      push(
        "kickout",
        victim,
        coverer,
        "",
        0,
        DUR.kickout,
        "No! " + wrestlers[victim].name + " si libera: intervento di " + wrestlers[helper].name + " dall'angolo!"
      );
      push(
        "knockdown",
        coverer,
        helper,
        "",
        0,
        DUR.knockdown,
        wrestlers[coverer].name + " paga il prezzo dell'intervento."
      );
      if (type === "tag") active[teamOf(helper)] = helper;
      actor = helper;
    } else {
      push(
        "kickout",
        victim,
        coverer,
        "",
        0,
        DUR.kickout,
        "No! " + wrestlers[victim].name + " spalanca le spalle all'ultimo respiro."
      );
      push(
        "getup",
        victim,
        coverer,
        "",
        0,
        DUR.getup,
        wrestlers[victim].name + " si rialza. L'aria cambia."
      );
      actor = victim;
    }
  };

  for (;;) {
    turns += 1;

    // Tag: prima di agire, la squadra può fare il cambio (il fresco recupera).
    if (type === "tag" && rng() < 0.22) {
      const tIdx = teamOf(actor);
      const cur = active[tIdx];
      const fresh = teams[tIdx].find((i) => i !== cur);
      if (fresh !== undefined) {
        active[tIdx] = fresh;
        energy[fresh] = clampEnergy(energy[fresh] + 30);
        push(
          "approach",
          fresh,
          cur,
          "",
          0,
          DUR.approach,
          wrestlers[cur].name + " dà il cambio: entra " + wrestlers[fresh].name + ", fresco di gambe!"
        );
        actor = fresh;
      }
    }

    // Chi non agisce respira.
    for (let i = 0; i < n; i++) {
      if (i === actor) continue;
      energy[i] = clampEnergy(energy[i] + 1 + wrestlers[i].stats.stamina * 0.3);
    }

    const pool = others(actor);
    const target = pool[Math.floor(rng() * pool.length)];
    const att = wrestlers[actor];
    const def = wrestlers[target];

    const forced = turns > MULTI_MAX_TURNS + 20;
    const endgame =
      (energy[target] <= 18 && (rng() < 0.55 || turns > MULTI_MAX_TURNS)) ||
      turns > MULTI_MAX_TURNS + 8;

    if (endgame) {
      push("lockup", actor, target, "", 0, DUR.lockup, "Collarino e gomito: qui si decide tutto.", 0);
      const dmg = Math.round(18 + rng() * 10 + att.stats.power * 0.8);
      energy[target] = clampEnergy(energy[target] - dmg);
      energy[actor] = clampEnergy(energy[actor] - 3);
      push(
        "finisher",
        actor,
        target,
        att.finisher,
        dmg,
        DUR.finisher,
        pick(rng, [
          att.name + " solleva " + def.name + " e lo scaraventa: " + att.finisher + "!",
          "Non si scappa: " + att.finisher + " di " + att.name + " su " + def.name + "!",
        ]),
        0,
        FINISHER_MOVE_ID.get(att.finisher.toLowerCase()),
        1200
      );
      push("knockdown", target, actor, "", 0, DUR.knockdown, def.name + " resta giù: il mat trema.", 0);
      // Vittoria credibile, come nel 1v1: solo su un avversario davvero piegato.
      const winProb = energy[target] <= 18 ? 0.9 - energy[target] * 0.008 : 0;
      const hs = helpers(actor, target);
      const winRoll = rng() < (forced ? 1 : winProb);
      const broken = !forced && hs.length > 0 && rng() < 0.35;
      if (winRoll && !broken) {
        push("pin", actor, target, "", 0, DUR.pin, "Copertura: uno… due… TRE! Il match è di " + att.name + ".", 0);
        push("win", actor, target, "", 0, DUR.win, att.name + " alza le braccia al soffitto dell'arena.");
        return finalize(actor, target);
      }
      push("pin", actor, target, "", 0, DUR.pin, att.name + " copre: uno… due…", 0);
      if (broken) {
        breakupOrKickout(actor, target);
      } else {
        push("kickout", target, actor, "", 0, DUR.kickout, "No! " + def.name + " spalanca le spalle all'ultimo respiro.");
        push("getup", target, actor, "", 0, DUR.getup, def.name + " si rialza. L'aria cambia.");
        actor = target;
      }
      continue;
    }

    // Scambio normale.
    push("lockup", actor, target, "", 0, DUR.lockup, "Presa al collarino: forza contro forza.", 0);
    const moves = MOVES.map((m) => ({ m, weight: 1 + att.stats[m.favors] * 0.6 }));
    let roll = rng() * moves.reduce((sum, p) => sum + p.weight, 0);
    let move = moves[0].m;
    for (const p of moves) {
      roll -= p.weight;
      if (roll <= 0) {
        move = p.m;
        break;
      }
    }
    const dmg = Math.round(move.base * (0.75 + rng() * 0.5) * (0.8 + att.stats.power * 0.06));
    energy[target] = clampEnergy(energy[target] - dmg);
    energy[actor] = clampEnergy(energy[actor] - (1 + rng() * 2));
    push(
      move.kind,
      actor,
      target,
      move.name,
      dmg,
      move.durMs,
      pick(rng, [
        att.name + " centra " + def.name + " con un " + move.name + " secco.",
        def.name + " incassa alla grande: " + move.name + " di " + att.name + ".",
        "Che impatto: " + move.name + "! " + def.name + " barcolla.",
      ]),
      DUR.gap,
      move.id,
      move.impactMs ?? (move.kind === "strike" ? 350 : 1050)
    );

    if (dmg >= 10 || energy[target] < 25) {
      push("knockdown", target, actor, "", 0, DUR.knockdown, def.name + " finisce al tappeto.", 0);
      if (rng() < 0.65) {
        push("pin", actor, target, "", 0, DUR.pin, att.name + " va alla copertura: uno… due…", 0);
        // Schienamento vincente solo su un avversario davvero a pezzi (< 25).
        const winProb = energy[target] < 25 ? 1 - (0.15 + energy[target] * 0.008) : 0;
        const hs = helpers(actor, target);
        const winRoll = rng() < (forced ? 1 : winProb);
        const broken = !forced && hs.length > 0 && rng() < 0.35;
        if (winRoll && !broken) {
          push("win", actor, target, "", 0, DUR.win, "Tre! " + att.name + " chiude l'incontro.");
          return finalize(actor, target);
        }
        push("kickout", target, actor, "", 0, DUR.kickout, def.name + " si libera appena in tempo.");
        if (broken) {
          breakupOrKickout(actor, target);
        } else {
          push("getup", target, actor, "", 0, DUR.getup, def.name + " si rialza a fatica.");
          actor = target;
        }
        continue;
      }
      push("getup", target, actor, "", 0, DUR.getup, def.name + " torna in piedi, sguardo lucido.");
    }

    // Prossimo turno: nel tag alterna la squadra, altrove il caos decide.
    if (type === "tag") {
      actor = active[teamOf(actor) === 0 ? 1 : 0];
    } else {
      const next = others(actor);
      actor = next[Math.floor(rng() * next.length)];
    }
  }
}
