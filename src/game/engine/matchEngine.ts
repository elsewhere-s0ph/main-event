import { mulberry32, seedFromString } from "../core/rng";
import type {
  EventKind,
  MatchEvent,
  MatchResult,
  Side,
  WrestlerDef,
} from "../types/match";

// Motore di incontro deterministico (C2). Regola di progetto (§5.2):
// qui dentro niente Math.random e niente Date — solo mulberry32 seminata.
// Il motore emette solo eventi con timestamp; le pose sono affare del renderer.

interface MoveDef {
  id: string;
  name: string;
  kind: "strike" | "grapple";
  base: number;
  /** Statistica che pesa di più nella scelta della mossa. */
  favors: "power" | "agility";
  durMs: number;
  /** Istante dell'impatto dentro l'evento, per la sincronia con la cronaca. */
  impactMs?: number;
}

const MOVES: readonly MoveDef[] = [
  { id: "elbow", name: "Gomitata", kind: "strike", base: 5, favors: "agility", durMs: 1000 },
  { id: "clothesline", name: "Clothesline", kind: "strike", base: 7, favors: "agility", durMs: 1000 },
  { id: "dropkick", name: "Dropkick", kind: "strike", base: 8, favors: "agility", durMs: 1100 },
  { id: "superkick", name: "Superkick", kind: "strike", base: 9, favors: "agility", durMs: 1100 },
  { id: "enzuigiri", name: "Enzuigiri", kind: "strike", base: 8, favors: "agility", durMs: 1100 },
  { id: "cutter", name: "Cutter", kind: "strike", base: 9, favors: "agility", durMs: 1000 },
  { id: "moonsault", name: "Moonsault", kind: "strike", base: 10, favors: "agility", durMs: 1200 },
  { id: "bodyslam", name: "Body slam", kind: "grapple", base: 9, favors: "power", durMs: 1500 },
  { id: "powerslam", name: "Powerslam", kind: "grapple", base: 10, favors: "power", durMs: 1600 },
  { id: "spinebuster", name: "Spinebuster", kind: "grapple", base: 10, favors: "power", durMs: 1500 },
  { id: "ddt", name: "DDT", kind: "grapple", base: 11, favors: "power", durMs: 1500 },
  { id: "suplex", name: "Suplex verticale", kind: "grapple", base: 12, favors: "power", durMs: 1800 },
  { id: "brainbuster", name: "Brainbuster", kind: "grapple", base: 12, favors: "power", durMs: 1700 },
  { id: "chokeslam", name: "Chokeslam", kind: "grapple", base: 13, favors: "power", durMs: 1700 },
  { id: "lariat", name: "Lariat", kind: "strike", base: 9, favors: "power", durMs: 1100, impactMs: 400 },
  { id: "bigboot", name: "Big boot", kind: "strike", base: 8, favors: "power", durMs: 1000, impactMs: 350 },
  { id: "sitoutpowerbomb", name: "Sit-Out Powerbomb", kind: "grapple", base: 12, favors: "power", durMs: 1700, impactMs: 1150 },
];

// Il finisher è testo libero: quando coincide con una mossa del catalogo
// (es. "Sit-Out Powerbomb") ricaviamo l'id per le coreografie dedicate.
const FINISHER_MOVE_ID = new Map(MOVES.map((m) => [m.name.toLowerCase(), m.id]));

const DUR = {
  entrance: 1500,
  approach: 1200,
  lockup: 900,
  knockdown: 1400,
  getup: 1600,
  finisher: 2200,
  pin: 1800,
  kickout: 900,
  win: 2000,
  gap: 250,
} as const;

const MAX_TURNS = 30;

function clampEnergy(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function pick<T>(rnd: () => number, options: readonly T[]): T {
  return options[Math.floor(rnd() * options.length)] as T;
}

export function simulateMatch(
  wrestlers: readonly [WrestlerDef, WrestlerDef],
  seed: string
): MatchResult {
  const rng = mulberry32(seedFromString("match:" + seed));
  const energy: [number, number] = [100, 100];
  const events: MatchEvent[] = [];
  let t = 0;
  let nextId = 0;

  const push = (
    kind: EventKind,
    actor: Side,
    moveName: string,
    damage: number,
    durMs: number,
    text: string,
    gap: number = DUR.gap,
    moveId?: string,
    impactMs?: number
  ) => {
    events.push({
      id: nextId++,
      t: Math.round(t),
      durMs,
      kind,
      actor,
      moveName,
      damage,
      text,
      ...(moveId ? { moveId } : {}),
      ...(impactMs ? { impactMs } : {}),
      energyAfter: [energy[0], energy[1]],
    });
    t += durMs + gap;
  };

  const finalize = (winner: Side): MatchResult => {
    const loser: Side = winner === 0 ? 1 : 0;
    const w = wrestlers[winner];
    const l = wrestlers[loser];
    const seconds = Math.round(t / 1000);
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, "0");
    const summary =
      `${w.name} batte ${l.name} in ${mm}:${ss}. ` +
      `${w.finisher} ha chiuso i conti.`;
    return {
      seed,
      wrestlers,
      winner,
      events,
      durationMs: Math.round(t),
      finalEnergy: [energy[0], energy[1]],
      summary,
    };
  };

  const [wa, wb] = wrestlers;
  push("entrance", 0, "", 0, DUR.entrance, `${wa.name} entra sul ring: ${wa.nickname}.`);
  push("entrance", 1, "", 0, DUR.entrance, `${wb.name} entra sul ring: ${wb.nickname}.`);
  push("approach", 0, "", 0, DUR.approach, "I due si studiano al centro del ring.");

  let actor: Side = rng() < 0.5 ? 0 : 1;
  let turns = 0;

  for (;;) {
    turns += 1;
    const target: Side = actor === 0 ? 1 : 0;
    const att = wrestlers[actor];
    const def = wrestlers[target];

    // Chi non agisce respira e recupera qualcosa.
    energy[target] = clampEnergy(energy[target] + 1 + def.stats.stamina * 0.4);

    // Circuito finale: finisher e schienamento.
    const endgame =
      (energy[target] <= 18 && (rng() < 0.55 || turns > MAX_TURNS)) ||
      turns > MAX_TURNS + 8;
    if (endgame) {
      push("lockup", actor, "", 0, DUR.lockup, "Collarino e gomito: qui si decide tutto.", 0);
      const dmg = Math.round(18 + rng() * 10 + att.stats.power * 0.8);
      energy[target] = clampEnergy(energy[target] - dmg);
      energy[actor] = clampEnergy(energy[actor] - 3);
      push(
        "finisher",
        actor,
        att.finisher,
        dmg,
        DUR.finisher,
        pick(rng, [
          `${att.name} solleva ${def.name} e lo scaraventa: ${att.finisher}!`,
          `Non si scappa: ${att.finisher} di ${att.name} su ${def.name}!`,
        ]),
        0,
        FINISHER_MOVE_ID.get(att.finisher.toLowerCase()),
        1200
      );
      push("knockdown", target, "", 0, DUR.knockdown, `${def.name} resta giù: il mat trema.`, 0);
      // Vittoria credibile: solo se il finisher ha davvero piegato l'avversario
      // (energia ≤ 18). Se no, kickout e il match continua: niente vittorie a fondo di energia.
      const winProb = energy[target] <= 18 ? 0.9 - energy[target] * 0.008 : 0;
      if (rng() < winProb) {
        push("pin", actor, "", 0, DUR.pin, `Copertura: uno… due… TRE! Il match è di ${att.name}.`, 0);
        push("win", actor, "", 0, DUR.win, `${att.name} alza le braccia al soffitto dell'arena.`);
        return finalize(actor);
      }
      push("pin", actor, "", 0, DUR.pin, `${att.name} copre: uno… due…`, 0);
      push("kickout", target, "", 0, DUR.kickout, `No! ${def.name} spalanca le spalle all'ultimo respiro.`);
      push("getup", target, "", 0, DUR.getup, `${def.name} si rialza. L'aria cambia.`);
      actor = target; // il comeback è nel motore, non nel marketing
      continue;
    }

    // Scambio normale.
    push("lockup", actor, "", 0, DUR.lockup, "Presa al collarino: forza contro forza.", 0);
    const pool = MOVES.map((m) => ({ m, weight: 1 + att.stats[m.favors] * 0.6 }));
    let roll = rng() * pool.reduce((sum, p) => sum + p.weight, 0);
    let move = pool[0].m;
    for (const p of pool) {
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
      move.name,
      dmg,
      move.durMs,
      pick(rng, [
        `${att.name} centra ${def.name} con un ${move.name} secco.`,
        `${def.name} incassa alla grande: ${move.name} di ${att.name}.`,
        `Che impatto: ${move.name}! ${def.name} barcolla.`,
      ]),
      DUR.gap,
      move.id,
      move.impactMs ?? (move.kind === "strike" ? 350 : 1050)
    );

    if (dmg >= 10 || energy[target] < 25) {
      push("knockdown", target, "", 0, DUR.knockdown, `${def.name} finisce al tappeto.`, 0);
      if (rng() < 0.65) {
        push("pin", actor, "", 0, DUR.pin, `${att.name} va alla copertura: uno… due…`, 0);
        // Schienamento vincente solo su un avversario davvero a pezzi (< 25):
        // i colpi forti abbattono, ma non chiudono da soli l'incontro.
        const winProb = energy[target] < 25 ? 1 - (0.15 + energy[target] * 0.008) : 0;
        if (rng() < winProb) {
          push("win", actor, "", 0, DUR.win, `Tre! ${att.name} chiude l'incontro.`);
          return finalize(actor);
        }
        push("kickout", target, "", 0, DUR.kickout, `${def.name} si libera appena in tempo.`);
        push("getup", target, "", 0, DUR.getup, `${def.name} si rialza a fatica.`);
        actor = target;
        continue;
      }
      push("getup", target, "", 0, DUR.getup, `${def.name} torna in piedi, sguardo lucido.`);
    }

    actor = rng() < 0.62 ? actor : target;
  }
}
