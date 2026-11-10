import { z } from "zod";
import type { Rivalry, RivalryPhase } from "../types/rivalry";

// Rivalità (C4): fasi narrative, intensità e calore del pubblico.
// Modulo puro: le regole vivono qui, la UI le racconta.

export const RIVALRY_PHASES: readonly RivalryPhase[] = [
  "inizio",
  "provocazione",
  "escalation",
  "conflitto",
  "culmine",
];

export const PHASE_LABELS: Record<RivalryPhase, string> = {
  inizio: "Inizio",
  provocazione: "Provocazione",
  escalation: "Escalation",
  conflitto: "Conflitto",
  culmine: "Culmine",
};

export const rivalryInputSchema = z.object({
  wrestlerIds: z.tuple([z.string().min(1), z.string().min(1)]),
});

export type RivalryInput = z.infer<typeof rivalryInputSchema>;

export type RivalryValidation =
  | { ok: true; value: RivalryInput }
  | { ok: false; error: string };

export function validateRivalryInput(raw: unknown): RivalryValidation {
  const parsed = rivalryInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Rivalità non valida" };
  }
  const [a, b] = parsed.data.wrestlerIds;
  if (a === b) {
    return { ok: false, error: "Una rivalità ha bisogno di due atleti diversi" };
  }
  return { ok: true, value: parsed.data };
}

/** Una rivalità nasce piccola: lo sguardo troppo lungo, il braccio tirato. */
export function createRivalry(
  id: string,
  saveId: string,
  participants: [string, string],
  today: string
): Rivalry {
  return {
    id,
    saveId,
    participants,
    intensity: 3,
    phase: "inizio",
    status: "attiva",
    startedOn: today,
    resolvedOn: null,
    heat: 20,
    story: ["La storia comincia con uno sguardo troppo lungo."],
  };
}

function phaseIndex(phase: RivalryPhase): number {
  return RIVALRY_PHASES.indexOf(phase);
}

/**
 * Avanza la rivalità di `steps` fasi (mai oltre il culmine: la risoluzione
 * avviene solo sul ring, o per decisione del GM).
 */
export function advanceRivalry(
  rivalry: Rivalry,
  steps: number,
  intensityGain: number,
  heatGain: number,
  episode: string
): Rivalry {
  const next = Math.min(
    phaseIndex(rivalry.phase) + Math.max(0, steps),
    RIVALRY_PHASES.length - 1
  );
  return {
    ...rivalry,
    phase: RIVALRY_PHASES[next],
    intensity: Math.min(10, rivalry.intensity + Math.max(0, intensityGain)),
    heat: Math.max(0, Math.min(100, rivalry.heat + heatGain)),
    story: [...rivalry.story.slice(-9), episode],
  };
}

/** Chiude la rivalità: la storia resta nei diari della federazione. */
export function resolveRivalry(
  rivalry: Rivalry,
  today: string,
  episode: string
): Rivalry {
  return {
    ...rivalry,
    status: "risolta",
    resolvedOn: today,
    story: [...rivalry.story.slice(-9), episode],
  };
}
