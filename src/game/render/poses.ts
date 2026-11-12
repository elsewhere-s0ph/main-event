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
  | "bigBoot"
  | "sitOut"
  | "dropkickAir"
  | "moonsaultAir"
  | "enzuigiriKick"
  | "ddtFall"
  | "throatLift"
  | "invertHang"
  | "flailBack"
  | "headSnap"
  | "spinFall"
  | "crouch"
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
  cover: { hip: 16, lean: 1.35, headTilt: 0.2, armFar: [1.35, 0.15], armNear: [1.25, 0.25], legFar: [-0.55, 0.25], legNear: [-0.4, 0.35] },
  bridge: { hip: 22, lean: -0.8, headTilt: -0.4, armFar: [-0.2, 0.1], armNear: [-0.15, 0.1], legFar: [0.5, -0.6], legNear: [0.4, -0.5] },
  getupLean: { hip: 26, lean: 0.9, headTilt: 0.2, armFar: [0.8, 0.3], armNear: [0.6, 0.4], legFar: [0.5, -0.6], legNear: [-0.2, 0.4] },
  dizzy: { hip: 43, lean: 0.2, headTilt: 0.45, armFar: [0.15, 0.6], armNear: [-0.1, 0.55], legFar: [0.1, -0.1], legNear: [-0.15, 0.15] },
  bigBoot: { hip: 44, lean: -0.25, headTilt: 0, armFar: [-0.6, 0.4], armNear: [0.5, 0.6], legFar: [-0.15, 0.1], legNear: [1.45, 0.15] },
  sitOut: { hip: 12, lean: 0.2, headTilt: 0.15, armFar: [-0.8, 0.25], armNear: [-0.7, 0.3], legFar: [1.3, 0.2], legNear: [1.1, 0.35] },
  dropkickAir: { hip: 34, lean: 1.15, headTilt: 0.1, armFar: [-0.9, 0.3], armNear: [-0.8, 0.35], legFar: [1.5, 0.05], legNear: [1.45, 0.1] },
  moonsaultAir: { hip: 30, lean: -2.6, headTilt: -0.2, armFar: [-1.5, 0.4], armNear: [-1.4, 0.5], legFar: [0.7, 0.9], legNear: [0.6, 1.0] },
  enzuigiriKick: { hip: 44, lean: -0.35, headTilt: 0, armFar: [-0.7, 0.4], armNear: [0.9, 0.3], legFar: [-0.1, 0.05], legNear: [1.9, 0.15] },
  ddtFall: { hip: 14, lean: -1.2, headTilt: -0.2, armFar: [-1.0, 0.3], armNear: [-0.9, 0.35], legFar: [0.5, -0.3], legNear: [0.4, -0.2] },
  // Pose-reazione della vittima: vendono la mossa chi la subisce.
  throatLift: { hip: 47, lean: -0.05, headTilt: -0.35, armFar: [-0.55, 0.3], armNear: [-0.7, 0.2], legFar: [0.4, 0.55], legNear: [0.2, 0.65] },
  invertHang: { hip: 46, lean: -3.0, headTilt: -0.3, armFar: [-0.45, 0.2], armNear: [-0.6, 0.25], legFar: [2.95, 0.1], legNear: [2.85, -0.1] },
  flailBack: { hip: 44, lean: -0.95, headTilt: -0.4, armFar: [2.2, 0.45], armNear: [2.4, 0.35], legFar: [0.9, -0.4], legNear: [0.7, -0.5] },
  headSnap: { hip: 44, lean: -0.7, headTilt: -0.75, armFar: [-0.7, 0.5], armNear: [-0.5, 0.4], legFar: [-0.3, 0.5], legNear: [0.4, -0.3] },
  spinFall: { hip: 40, lean: 0.9, headTilt: 0.5, armFar: [1.9, 0.4], armNear: [-1.5, 0.35], legFar: [-0.7, 0.5], legNear: [0.6, -0.4] },
  // Anticipazione: raccolto su se stesso prima del sollevamento.
  crouch: { hip: 34, lean: 0.35, headTilt: 0.1, armFar: [0.9, 0.4], armNear: [0.7, 0.35], legFar: [0.55, -0.7], legNear: [-0.45, 0.65] },
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
    actor: { kf: [{ at: 0, pose: "lunge", dx: -10 }, { at: 450, pose: "lockupPose", dx: 50 }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -30 }, { at: 900, pose: "lockupPose", dx: -50 }] },
  },
  strike: {
    actor: { kf: [{ at: 0, pose: "lunge", dx: -6 }, { at: 350, pose: "clotheslineArm", dx: 30 }, { at: 700, pose: "lunge", dx: 10 }, { at: 1200, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", hold: true }, { at: 300, pose: "idle", hold: true }, { at: 400, pose: "hitStun", dx: -20 }, { at: 750, pose: "dizzy", dx: -12 }, { at: 1200, pose: "idle" }] },
  },
  grapple: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 46 }, { at: 250, pose: "crouch", dx: 40 }, { at: 450, pose: "lift", dx: 50 }, { at: 750, pose: "lift", dx: 48 }, { at: 1050, pose: "lunge", dx: 30 }, { at: 1800, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -48 }, { at: 450, pose: "suspended", dx: -54, dy: -58 }, { at: 750, pose: "suspended", dx: -52, dy: -66 }, { at: 1050, pose: "downFlat", dx: -132, dy: -2 }, { at: 1800, pose: "downFlat", dx: -132 }] },
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
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 46 }, { at: 300, pose: "crouch", dx: 40 }, { at: 600, pose: "lift", dx: 52 }, { at: 900, pose: "lift", dx: 50 }, { at: 1200, pose: "lunge", dx: 30, dy: -6 }, { at: 1600, pose: "armUp", dy: -10 }, { at: 2200, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -48 }, { at: 600, pose: "suspended", dx: -56, dy: -62 }, { at: 900, pose: "suspended", dx: -54, dy: -76 }, { at: 1200, pose: "downFlat", dx: -120, dy: -2 }, { at: 1400, pose: "downFlat", dx: -120 }, { at: 2200, pose: "downFlat", dx: -120 }] },
  },
  pin: {
    actor: { kf: [{ at: 0, pose: "cover" }, { at: 1800, pose: "cover" }], follow: true },
    target: { kf: [{ at: 0, pose: "downFlat", hold: true }, { at: 1800, pose: "downFlat", hold: true }] },
  },
  kickout: {
    actor: { kf: [{ at: 0, pose: "cover" }, { at: 200, pose: "hitStun", dx: -40 }, { at: 900, pose: "dizzy", dx: -30 }] },
    target: { kf: [{ at: 0, pose: "bridge", hold: true }, { at: 300, pose: "bridge", hold: true, dy: -12 }, { at: 900, pose: "bridge", hold: true }] },
  },
  win: {
    actor: { kf: [{ at: 0, pose: "winPose" }, { at: 800, pose: "armUp" }, { at: 2000, pose: "armUp" }] },
    target: { kf: [{ at: 0, pose: "downFlat", hold: true }, { at: 2000, pose: "downFlat", hold: true }] },
  },
};

/** Coreografie per mossa specifica: sovrascrivono quelle per tipo di evento.
 * Convenzione contatto: anca attore + anca bersaglio ≈ 22–30 px di distanza
 * all'impatto (i corpi si toccano), poi il bersaglio viene respinto. */
export const MOVE_CHOREO: Record<string, { actor: Track; target: Track }> = {
  elbow: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 250, pose: "lunge", dx: 34 }, { at: 450, pose: "lockupPose", dx: 56 }, { at: 700, pose: "lunge", dx: 22 }, { at: 1000, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 250, pose: "idle", dx: -20 }, { at: 450, pose: "headSnap", dx: -50 }, { at: 700, pose: "dizzy", dx: -34 }, { at: 1000, pose: "idle" }] },
  },
  clothesline: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 220, pose: "lunge", dx: 30 }, { at: 420, pose: "clotheslineArm", dx: 62 }, { at: 700, pose: "lunge", dx: 30 }, { at: 1000, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 250, pose: "idle", dx: -22 }, { at: 420, pose: "flailBack", dx: -58, dy: -16 }, { at: 640, pose: "downFlat", dx: -84, dy: -2 }, { at: 720, pose: "downFlat", dx: -86 }, { at: 1000, pose: "downFlat", dx: -86 }] },
  },
  dropkick: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 200, pose: "lunge", dx: 10 }, { at: 340, pose: "lunge", dx: 34, dy: -26 }, { at: 480, pose: "dropkickAir", dx: 58, dy: -34 }, { at: 760, pose: "lunge", dx: 24, dy: -4 }, { at: 1100, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 300, pose: "idle", dx: -24 }, { at: 480, pose: "flailBack", dx: -64, dy: -20 }, { at: 720, pose: "downFlat", dx: -92, dy: -2 }, { at: 800, pose: "downFlat", dx: -94 }, { at: 1100, pose: "downFlat", dx: -94 }] },
  },
  superkick: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 240, pose: "lunge", dx: 26 }, { at: 460, pose: "bigBoot", dx: 58 }, { at: 720, pose: "lunge", dx: 20 }, { at: 1100, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 280, pose: "idle", dx: -22 }, { at: 460, pose: "headSnap", dx: -56 }, { at: 640, pose: "flailBack", dx: -76, dy: -10 }, { at: 760, pose: "downFlat", dx: -84, dy: -2 }, { at: 840, pose: "downFlat", dx: -86 }, { at: 1100, pose: "downFlat", dx: -86 }] },
  },
  enzuigiri: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 260, pose: "lunge", dx: 22 }, { at: 500, pose: "enzuigiriKick", dx: 50 }, { at: 760, pose: "lunge", dx: 16 }, { at: 1100, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 320, pose: "idle", dx: -20 }, { at: 500, pose: "spinFall", dx: -56 }, { at: 700, pose: "downFlat", dx: -78, dy: -2 }, { at: 780, pose: "downFlat", dx: -80 }, { at: 1100, pose: "downFlat", dx: -80 }] },
  },
  cutter: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 220, pose: "lunge", dx: 36 }, { at: 520, pose: "ddtFall", dx: 48, dy: -2 }, { at: 760, pose: "getupLean", dx: 36 }, { at: 1000, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 280, pose: "idle", dx: -26 }, { at: 420, pose: "suspended", dx: -54, dy: -34 }, { at: 520, pose: "downFlat", dx: -66, dy: -2 }, { at: 620, pose: "downFlat", dx: -68 }, { at: 1000, pose: "downFlat", dx: -68 }] },
  },
  moonsault: {
    actor: { kf: [{ at: 0, pose: "idle" }, { at: 220, pose: "lunge", dx: 6, dy: -14 }, { at: 400, pose: "moonsaultAir", dx: 30, dy: -44 }, { at: 560, pose: "moonsaultAir", dx: 52, dy: -30 }, { at: 800, pose: "lunge", dx: 40, dy: -2 }, { at: 1200, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", hold: true }, { at: 480, pose: "idle", hold: true }, { at: 560, pose: "flailBack", dx: -54 }, { at: 680, pose: "downFlat", dx: -74, dy: -2 }, { at: 760, pose: "downFlat", dx: -76 }, { at: 1200, pose: "downFlat", dx: -76 }] },
  },
  lariat: {
    actor: { kf: [{ at: 0, pose: "lunge", dx: -20 }, { at: 250, pose: "lunge", dx: 34 }, { at: 450, pose: "clotheslineArm", dx: 62 }, { at: 750, pose: "lunge", dx: 26 }, { at: 1100, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 300, pose: "idle", dx: -26 }, { at: 450, pose: "flailBack", dx: -58, dy: -12 }, { at: 640, pose: "downFlat", dx: -86, dy: -2 }, { at: 720, pose: "downFlat", dx: -88 }, { at: 1100, pose: "downFlat", dx: -88 }] },
  },
  bigboot: {
    actor: { kf: [{ at: 0, pose: "lunge", dx: -12 }, { at: 240, pose: "lunge", dx: 16 }, { at: 420, pose: "bigBoot", dx: 58 }, { at: 700, pose: "lunge", dx: 20 }, { at: 1000, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "idle", dx: -6 }, { at: 280, pose: "idle", dx: -24 }, { at: 420, pose: "flailBack", dx: -56, dy: -10 }, { at: 620, pose: "downFlat", dx: -82, dy: -2 }, { at: 700, pose: "downFlat", dx: -84 }, { at: 1000, pose: "downFlat", dx: -84 }] },
  },
  bodyslam: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 50 }, { at: 250, pose: "crouch", dx: 44 }, { at: 400, pose: "lift", dx: 52 }, { at: 700, pose: "lift", dx: 50 }, { at: 1050, pose: "lunge", dx: 30 }, { at: 1500, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -52 }, { at: 400, pose: "suspended", dx: -56, dy: -50 }, { at: 700, pose: "suspended", dx: -54, dy: -56 }, { at: 950, pose: "suspended", dx: -60, dy: -18 }, { at: 1050, pose: "downFlat", dx: -66, dy: -2 }, { at: 1200, pose: "downFlat", dx: -68 }, { at: 1500, pose: "downFlat", dx: -68 }] },
  },
  powerslam: {
    actor: { kf: [{ at: 0, pose: "lunge", dx: -16 }, { at: 300, pose: "lunge", dx: 40 }, { at: 420, pose: "crouch", dx: 46 }, { at: 500, pose: "lift", dx: 54 }, { at: 800, pose: "lift", dx: 52 }, { at: 1100, pose: "lunge", dx: 38 }, { at: 1600, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -40 }, { at: 300, pose: "lockupPose", dx: -56 }, { at: 500, pose: "suspended", dx: -60, dy: -54 }, { at: 800, pose: "suspended", dx: -58, dy: -60 }, { at: 1000, pose: "suspended", dx: -62, dy: -22 }, { at: 1100, pose: "downFlat", dx: -72, dy: -2 }, { at: 1250, pose: "downFlat", dx: -74 }, { at: 1600, pose: "downFlat", dx: -74 }] },
  },
  spinebuster: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 48 }, { at: 220, pose: "crouch", dx: 42 }, { at: 350, pose: "lift", dx: 54 }, { at: 600, pose: "lift", dx: 52 }, { at: 950, pose: "lunge", dx: 36 }, { at: 1500, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -50 }, { at: 350, pose: "suspended", dx: -58, dy: -46 }, { at: 600, pose: "suspended", dx: -56, dy: -56 }, { at: 850, pose: "flailBack", dx: -60, dy: -20 }, { at: 950, pose: "downFlat", dx: -70, dy: -2 }, { at: 1150, pose: "downFlat", dx: -72 }, { at: 1500, pose: "downFlat", dx: -72 }] },
  },
  ddt: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 48 }, { at: 400, pose: "lockupPose", dx: 52 }, { at: 650, pose: "crouch", dx: 50 }, { at: 900, pose: "ddtFall", dx: 42, dy: -2 }, { at: 1200, pose: "getupLean", dx: 34 }, { at: 1500, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -50 }, { at: 400, pose: "suspended", dx: -56, dy: -26 }, { at: 700, pose: "suspended", dx: -58, dy: -30 }, { at: 900, pose: "downFlat", dx: -62, dy: -2 }, { at: 1000, pose: "downFlat", dx: -64 }, { at: 1500, pose: "downFlat", dx: -64 }] },
  },
  suplex: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 46 }, { at: 250, pose: "crouch", dx: 40 }, { at: 450, pose: "lift", dx: 50 }, { at: 800, pose: "lift", dx: 48 }, { at: 1250, pose: "ddtFall", dx: 30, dy: -2 }, { at: 1550, pose: "getupLean", dx: 26 }, { at: 1800, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -48 }, { at: 450, pose: "invertHang", dx: -52, dy: -40 }, { at: 800, pose: "invertHang", dx: -50, dy: -84 }, { at: 1050, pose: "invertHang", dx: -48, dy: -64 }, { at: 1250, pose: "downFlat", dx: -96, dy: -2 }, { at: 1400, pose: "downFlat", dx: -98 }, { at: 1800, pose: "downFlat", dx: -98 }] },
  },
  brainbuster: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 46 }, { at: 220, pose: "crouch", dx: 40 }, { at: 400, pose: "lift", dx: 50 }, { at: 750, pose: "lift", dx: 48 }, { at: 1150, pose: "lunge", dx: 34 }, { at: 1700, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -48 }, { at: 400, pose: "invertHang", dx: -52, dy: -46 }, { at: 750, pose: "invertHang", dx: -50, dy: -92 }, { at: 1000, pose: "invertHang", dx: -48, dy: -74 }, { at: 1150, pose: "downFlat", dx: -78, dy: -2 }, { at: 1300, pose: "downFlat", dx: -80 }, { at: 1700, pose: "downFlat", dx: -80 }] },
  },
  chokeslam: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 44 }, { at: 250, pose: "crouch", dx: 38 }, { at: 450, pose: "lift", dx: 50, dy: -4 }, { at: 850, pose: "lift", dx: 48, dy: -8 }, { at: 1200, pose: "lunge", dx: 30 }, { at: 1700, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -46 }, { at: 450, pose: "throatLift", dx: -54, dy: -46 }, { at: 850, pose: "throatLift", dx: -52, dy: -88 }, { at: 1080, pose: "flailBack", dx: -74, dy: -34 }, { at: 1200, pose: "downFlat", dx: -110, dy: -2 }, { at: 1400, pose: "downFlat", dx: -112 }, { at: 1700, pose: "downFlat", dx: -112 }] },
  },
  sitoutpowerbomb: {
    actor: { kf: [{ at: 0, pose: "lockupPose", dx: 46 }, { at: 250, pose: "crouch", dx: 40 }, { at: 450, pose: "lift", dx: 50 }, { at: 800, pose: "lift", dx: 48 }, { at: 1150, pose: "sitOut", dx: 26, dy: -2 }, { at: 1500, pose: "sitOut", dx: 22 }, { at: 1700, pose: "idle" }] },
    target: { kf: [{ at: 0, pose: "lockupPose", dx: -48 }, { at: 350, pose: "invertHang", dx: -52, dy: -34 }, { at: 700, pose: "invertHang", dx: -50, dy: -82 }, { at: 1000, pose: "invertHang", dx: -46, dy: -58 }, { at: 1150, pose: "downFlat", dx: -44, dy: -2 }, { at: 1350, pose: "downFlat", dx: -46 }, { at: 1700, pose: "downFlat", dx: -46 }] },
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
