// Pose chiave + interpolazione: l'animazione è fatta di scheletri
// articolati, mai di sprite a frame (Documento Master §6.1).
// Un solo orientamento disegnato (verso destra): l'altro è il flip (§6.3).

import type { EventKind } from "../types/match";

export interface PoseFrame {
  /** Altezza del bacino da terra (px logici). */
  hip: number;
  /** Inclinazione del busto in radianti (positivo = in avanti). */
  lean: number;
  headTilt: number;
  /** [spalla, gomito] braccio lontano, radianti da "braccio disteso in giù". */
  armFar: readonly [number, number];
  armNear: readonly [number, number];
  /** [anca, ginocchio] gamba lontana. */
  legFar: readonly [number, number];
  legNear: readonly [number, number];
}

export type PoseId =
  | "idle"
  | "walkA"
  | "walkB"
  | "armUp"
  | "lockupPose"
  | "lunge"
  | "clotheslineArm"
  | "hitStun"
  | "lift"
  | "suspended"
  | "downFlat"
  | "cover"
  | "bridge"
  | "getupLean"
  | "dizzy"
  | "winPose";

export const POSES: Record<PoseId, PoseFrame> = {
  idle: { hip: 46, lean: 0.05, headTilt: 0, armFar: [0.3, 0.5], armNear: [-0.25, 0.4], legFar: [0.1, -0.08], legNear: [-0.12, 0.12] },
  walkA: { hip: 45, lean: 0.14, headTilt: 0, armFar: [-0.5, 0.4], armNear: [0.45, 0.3], legFar: [0.5, -0.25], legNear: [-0.4, 0.35] },
  walkB: { hip: 45, lean: 0.14, headTilt: 0, armFar: [0.45, 0.3], armNear: [-0.5, 0.4], legFar: [-0.4, 0.35], legNear: [0.5, -0.25] },
  armUp: { hip: 47, lean: -0.06, headTilt: -0.12, armFar: [2.4, 0.35], armNear: [2.6, 0.2], legFar: [0.12, -0.05], legNear: [-0.14, 0.1] },
  lockupPose: { hip: 44, lean: 0.45, headTilt: 0.1, armFar: [1.2, 0.5], armNear: [1.35, 0.35], legFar: [0.25, -0.2], legNear: [-0.3, 0.3] },
  lunge: { hip: 42, lean: 0.5, headTilt: 0.15, armFar: [-0.6, 0.3], armNear: [0.8, 0.2], legFar: [0.6, -0.3], legNear: [-0.55, 0.5] },
  clotheslineArm: { hip: 43, lean: 0.4, headTilt: 0.1, armFar: [-0.4, 0.3], armNear: [1.55, 0.05], legFar: [0.55, -0.25], legNear: [-0.5, 0.45] },
  hitStun: { hip: 44, lean: -0.55, headTilt: -0.5, armFar: [-0.9, 0.5], armNear: [-1.1, 0.4], legFar: [-0.35, 0.4], legNear: [0.3, -0.2] },
  lift: { hip: 45, lean: -0.15, headTilt: -0.1, armFar: [2.0, 0.3], armNear: [2.3, 0.2], legFar: [0.2, -0.15], legNear: [-0.25, 0.25] },
  suspended: { hip: 12, lean: -2.7, headTilt: -0.3, armFar: [-1.4, 0.2], armNear: [1.3, 0.25], legFar: [2.7, -0.2], legNear: [2.5, 0.15] },
  downFlat: { hip: 7, lean: -1.45, headTilt: -0.3, armFar: [-1.2, 0.3], armNear: [1.1, 0.3], legFar: [0.15, -0.1], legNear: [0.35, 0.05] },
  cover: { hip: 30, lean: 1.0, headTilt: 0.3, armFar: [0.7, 0.2], armNear: [0.5, 0.3], legFar: [0.4, -0.5], legNear: [-0.2, 0.35] },
  bridge: { hip: 22, lean: -0.8, headTilt: -0.4, armFar: [-0.2, 0.1], armNear: [-0.15, 0.1], legFar: [0.5, -0.6], legNear: [0.4, -0.5] },
  getupLean: { hip: 26, lean: 0.9, headTilt: 0.2, armFar: [0.8, 0.3], armNear: [0.6, 0.4], legFar: [0.5, -0.6], legNear: [-0.2, 0.4] },
  dizzy: { hip: 43, lean: 0.2, headTilt: 0.45, armFar: [0.15, 0.6], armNear: [-0.1, 0.55], legFar: [0.1, -0.1], legNear: [-0.15, 0.15] },
  winPose: { hip: 47, lean: -0.1, headTilt: -0.15, armFar: [0.9, 0.2], armNear: [2.65, 0.15], legFar: [0.1, -0.05], legNear: [-0.15, 0.12] },
};

export interface KeyFrame {
  /** Istante dentro l'evento, in ms. */
  at: number;
  pose: PoseId;
  /** Traslazione verso l'avversario (px logici, definita per attore a sinistra). */
  dx?: number;
  /** Spostamento verticale (negativo = alzato da terra). */
  dy?: number;
  /** Se true, la posizione resta quella attuale. */
  hold?: boolean;
}

export interface Track {
  kf: readonly KeyFrame[];
  /** "follow": la X segue quella dell'avversario (copertura). */
  follow?: boolean;
}

/** Coreografie per tipo di evento. Il "target" è chi incassa. */
export const CHOREO: Record<EventKind, { actor: Track; target: Track }> = {
  entrance: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 200, pose: "armUp" }, { at: 1300, pose: "armUp" }, { at: 1500, pose: "idle" }] },
    target: { kf: [] },
  },
  approach: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 200, pose: "walkA" }, { at: 500, pose: "walkB" }, { at: 800, pose: "walkA" }, { at: 1100, pose: "idle" }] },
    target: { kf: [] },
  },
  lockup: {
    actor: { kf: [{ at: 0, pose: "lunge", dx: -8 }, { at: 900, pose: "lockupPose", dx: 10 }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -8 }, { at: 900, pose: "lockupPose", dx: -8 }] },
  },
  strike: {
    actor: { kf: [{ at: 0, pose: "lunge", dx: -6 }, { at: 350, pose: "clotheslineArm", dx: 30 }, { at: 700, pose: "lunge", dx: 10 }, { at: 1000, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", hold: true }, { at: 300, pose: "idle", hold: true }, { at: 400, pose: "hitStun", dx: -20 }, { at: 750, pose: "dizzy", dx: -12 }, { at: 1000, pose: "idle" }] },
  },
  grapple: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 10 }, { at: 450, pose: "lift", dx: 4 }, { at: 750, pose: "lift", dx: 2 }, { at: 1050, pose: "lunge", dx: -6 }, { at: 1500, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -10 }, { at: 450, pose: "getupLean", dx: -120, dy: -18 }, { at: 750, pose: "suspended", dx: -132, dy: -64 }, { at: 1050, pose: "downFlat", dx: -132, dy: -2 }, { at: 1500, pose: "downFlat", dx: -132 }] },
  },
  knockdown: {
    actor: { kf: [] },
    target: { kf: [{ at: 0, pose: "downFlat", hold: true }, { at: 1400, pose: "downFlat", hold: true }] },
  },
  getup: {
    actor: { kf: [] },
    target: { kf: [{ at: 0, pose: "getupLean", hold: true }, { at: 900, pose: "idle", hold: true }, { at: 1600, pose: "idle" }] },
  },
  finisher: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 12 }, { at: 600, pose: "lift", dx: 6 }, { at: 900, pose: "lift", dx: 4 }, { at: 1200, pose: "lunge", dx: -8 }, { at: 1600, pose: "armUp", dy: -6 }, { at: 2200, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -12 }, { at: 600, pose: "getupLean", dx: -130, dy: -24 }, { at: 900, pose: "suspended", dx: -132, dy: -70 }, { at: 1200, pose: "downFlat", dx: -132, dy: -26 }, { at: 1400, pose: "downFlat", dx: -132 }, { at: 2200, pose: "downFlat", dx: -132 }] },
  },
  pin: {
    actor: { kf: [{ at: 0, pose: "cover" }, { at: 1800, pose: "cover" }], follow: true },
    target: { kf: [{ at: 0, pose: "downFlat", hold: true }, { at: 1800, pose: "downFlat", hold: true }] },
  },
  kickout: {
    actor: { kf: [{ at: 0, pose: "cover" }, { at: 200, pose: "hitStun", dx: -40 }, { at: 900, pose: "dizzy", dx: -30 }] },
    target: { kf: [{ at: 0, pose: "bridge", hold: true }, { at: 300, pose: "bridge", hold: true, dy: -8 }, { at: 900, pose: "bridge", hold: true }] },
  },
  win: {
    actor: { kf: [{ at: 0, pose: "winPose" }, { at: 800, pose: "armUp" }, { at: 2000, pose: "armUp" }] },
    target: { kf: [{ at: 0, pose: "downFlat", hold: true }, { at: 2000, pose: "downFlat", hold: true }] },
  },
};

export interface PoseSample {
  frame: PoseFrame;
  dx: number;
  dy: number;
  hold: boolean;
}

const ease = (u: number) => u * u * (3 - 2 * u);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

function lerpPair(
  a: readonly [number, number],
  b: readonly [number, number],
  u: number
): [number, number] {
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
}

function lerpFrame(a: PoseFrame, b: PoseFrame, u: number): PoseFrame {
  return {
    hip: lerp(a.hip, b.hip, u),
    lean: lerp(a.lean, b.lean, u),
    headTilt: lerp(a.headTilt, b.headTilt, u),
    armFar: lerpPair(a.armFar, b.armFar, u),
    armNear: lerpPair(a.armNear, b.armNear, u),
    legFar: lerpPair(a.legFar, b.legFar, u),
    legNear: lerpPair(a.legNear, b.legNear, u),
  };
}

function atSample(k: KeyFrame): PoseSample {
  return { frame: POSES[k.pose], dx: k.dx ?? 0, dy: k.dy ?? 0, hold: k.hold ?? false };
}

/** Campiona la coreografia all'istante localT (ms dentro l'evento). */
export function sampleTrack(track: Track, localT: number): PoseSample | null {
  const kf = track.kf;
  if (kf.length === 0) return null;
  const last = kf[kf.length - 1];
  if (last === undefined) return null;
  if (localT <= kf[0].at || kf.length === 1) return atSample(kf[0]);
  if (localT >= last.at) return atSample(last);
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i];
    const b = kf[i + 1];
    if (a !== undefined && b !== undefined && localT >= a.at && localT < b.at) {
      const u = ease((localT - a.at) / Math.max(1, b.at - a.at));
      return {
        frame: lerpFrame(POSES[a.pose], POSES[b.pose], u),
        dx: lerp(a.dx ?? 0, b.dx ?? 0, u),
        dy: lerp(a.dy ?? 0, b.dy ?? 0, u),
        hold: b.hold ?? a.hold ?? false,
      };
    }
  }
  return atSample(last);
}

/** Ultimo keyframe della coreografia: la posizione di riposo. */
export function restingSample(track: Track): PoseSample | null {
  const kf = track.kf;
  if (kf.length === 0) return null;
  const last = kf[kf.length - 1];
  return last === undefined ? null : atSample(last);
}
