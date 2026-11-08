import type { MatchEvent, MatchResult, Side, WrestlerDef } from "../types/match";
import { CHOREO, POSES, restingSample, sampleTrack, type PoseFrame, type PoseSample, type Track } from "./poses";

// Renderer del ring isometrico: canvas 2D puro, scena logica 480×300
// ridisegnata ogni frame e scalata per riempire lo spazio disponibile.
// Le animazioni nascono dalle coreografie pose+tween (Documento Master §6).

export const SCENE_W = 480;
export const SCENE_H = 300;

const MAT_CX = 240;
const MAT_CY = 198;
const MAT_HW = 150;
const MAT_HH = 60;
const SLOT_DX = 64;
const GROUND_Y = 216;
const POST_H = 54;
const ROPE_H = [16, 30, 44];
const ROPE_COLORS = ["#8890b0", "#2dd4bf", "#e8b84b"];
const GOLD = "#e8b84b";

interface Resting {
  sample: PoseSample;
  flip: 1 | -1;
}

export interface WrestlerPos {
  x: number;
  y: number;
}

export interface SceneState {
  pos: [WrestlerPos, WrestlerPos];
  resting: [Resting | null, Resting | null];
}

export function createScene(): SceneState {
  return {
    pos: [
      { x: MAT_CX - SLOT_DX, y: 0 },
      { x: MAT_CX + SLOT_DX, y: 0 },
    ],
    resting: [null, null],
  };
}

function shade(hex: string, factor: number): string {
  const n = hex.replace("#", "");
  const r = Math.round(parseInt(n.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(n.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(n.slice(4, 6), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

interface Proportions {
  torso: number;
  headR: number;
  ua: number;
  fa: number;
  thigh: number;
  calf: number;
  lw: number;
}

function proportions(def: WrestlerDef): Proportions {
  if (def.bodyType === "heavyweight") {
    return { torso: 30, headR: 9, ua: 17, fa: 16, thigh: 18, calf: 17, lw: 12 };
  }
  return { torso: 28, headR: 7.5, ua: 15, fa: 14, thigh: 20, calf: 18, lw: 8.5 };
}

function limb(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  a1: number,
  a2: number,
  l1: number,
  l2: number,
  facing: number,
  lw: number,
  color: string
): void {
  const jx = ox + Math.sin(a1) * l1 * facing;
  const jy = oy + Math.cos(a1) * l1;
  const ex = jx + Math.sin(a1 + a2) * l2 * facing;
  const ey = jy + Math.cos(a1 + a2) * l2;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(jx, jy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  return;
}

function handPoint(ox: number, oy: number, a1: number, a2: number, l1: number, l2: number, facing: number): [number, number] {
  const jx = ox + Math.sin(a1) * l1 * facing;
  const jy = oy + Math.cos(a1) * l1;
  return [jx + Math.sin(a1 + a2) * l2 * facing, jy + Math.cos(a1 + a2) * l2];
}

function drawWrestler(
  ctx: CanvasRenderingContext2D,
  def: WrestlerDef,
  frame: PoseFrame,
  x: number,
  lift: number,
  facing: number,
  wallMs: number
): void {
  const p = proportions(def);
  const skin = def.colors.skin;
  const skinDark = shade(skin, 0.72);
  const bob = Math.sin(wallMs / 420) * 1.1;
  const ground = GROUND_Y - lift;

  // Ombra sul mat
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 4, 24 - lift * 0.08, 7 - lift * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const py = ground - frame.hip + bob;
  const px = x;
  const sx = px + Math.sin(frame.lean) * p.torso * facing;
  const sy = py - Math.cos(frame.lean) * p.torso;
  const ha = frame.lean + frame.headTilt;
  const hx = sx + Math.sin(ha) * p.headR * 1.5 * facing;
  const hy = sy - Math.cos(ha) * p.headR * 1.5;
  const trim = def.colors.trim;

  ctx.lineCap = "round";
  // Arti lontani
  limb(ctx, sx, sy, frame.armFar[0], frame.armFar[1], p.ua, p.fa, facing, p.lw * 0.85, skinDark);
  limb(ctx, px, py, frame.legFar[0], frame.legFar[1], p.thigh, p.calf, facing, p.lw * 0.9, skinDark);
  const bootFar = handPoint(px, py, frame.legFar[0], frame.legFar[1], p.thigh, p.calf, facing);
  // Busto
  ctx.strokeStyle = skin;
  ctx.lineWidth = p.lw * 1.25;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  // Collant della gimmack: banda sul bacino
  ctx.strokeStyle = trim;
  ctx.lineWidth = p.lw * 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py + 1);
  ctx.lineTo(px + (sx - px) * 0.16, py + (sy - py) * 0.16 + 1);
  ctx.stroke();
  // Testa
  ctx.strokeStyle = skin;
  ctx.lineWidth = p.lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, p.headR, 0, Math.PI * 2);
  ctx.fill();
  // Capelli
  ctx.fillStyle = "#241c33";
  ctx.beginPath();
  ctx.arc(hx, hy - p.headR * 0.25, p.headR * 0.92, Math.PI, Math.PI * 2);
  ctx.fill();
  // Stivali
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(bootFar[0], bootFar[1], p.lw * 0.52, 0, Math.PI * 2);
  ctx.fill();
  // Arti vicini
  limb(ctx, px, py, frame.legNear[0], frame.legNear[1], p.thigh, p.calf, facing, p.lw, skin);
  const bootNear = handPoint(px, py, frame.legNear[0], frame.legNear[1], p.thigh, p.calf, facing);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(bootNear[0], bootNear[1], p.lw * 0.55, 0, Math.PI * 2);
  ctx.fill();
  limb(ctx, sx, sy, frame.armNear[0], frame.armNear[1], p.ua, p.fa, facing, p.lw, skin);
  const handNear = handPoint(sx, sy, frame.armNear[0], frame.armNear[1], p.ua, p.fa, facing);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(handNear[0], handNear[1], p.lw * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRingBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, 0, SCENE_H);
  grad.addColorStop(0, "#0b0e1a");
  grad.addColorStop(1, "#141b32");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);

  for (const gx of [120, 360]) {
    const glow = ctx.createRadialGradient(gx, 20, 5, gx, 20, 170);
    glow.addColorStop(0, "rgba(232, 184, 75, 0.16)");
    glow.addColorStop(1, "rgba(232, 184, 75, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(gx - 170, -150, 340, 340);
  }

  const L: [number, number] = [MAT_CX - MAT_HW, MAT_CY];
  const T: [number, number] = [MAT_CX, MAT_CY - MAT_HH];
  const R: [number, number] = [MAT_CX + MAT_HW, MAT_CY];
  const B: [number, number] = [MAT_CX, MAT_CY + MAT_HH];
  const apronH = 24;

  // Fronte dell'aprone
  ctx.beginPath();
  ctx.moveTo(L[0], L[1]);
  ctx.lineTo(B[0], B[1]);
  ctx.lineTo(R[0], R[1]);
  ctx.lineTo(R[0], R[1] + apronH);
  ctx.lineTo(B[0], B[1] + apronH);
  ctx.lineTo(L[0], L[1] + apronH);
  ctx.closePath();
  ctx.fillStyle = "#1a2140";
  ctx.fill();
  ctx.strokeStyle = "#2a3355";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.85;
  ctx.fillText("MAIN EVENT", MAT_CX, MAT_CY + MAT_HH + apronH * 0.68);
  ctx.restore();

  // Mat
  ctx.beginPath();
  ctx.moveTo(L[0], L[1]);
  ctx.lineTo(T[0], T[1]);
  ctx.lineTo(R[0], R[1]);
  ctx.lineTo(B[0], B[1]);
  ctx.closePath();
  ctx.fillStyle = "#20294d";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(L[0] + 12, L[1] - 5);
  ctx.lineTo(T[0], T[1] + 5);
  ctx.lineTo(R[0] - 12, R[1] - 5);
  ctx.lineTo(B[0], B[1] + 5);
  ctx.closePath();
  ctx.fillStyle = "#1b2346";
  ctx.fill();
  ctx.strokeStyle = "rgba(232, 184, 75, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = "rgba(232, 184, 75, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(MAT_CX, MAT_CY, 26, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRopes(ctx: CanvasRenderingContext2D, back: boolean): void {
  const L: [number, number] = [MAT_CX - MAT_HW, MAT_CY];
  const T: [number, number] = [MAT_CX, MAT_CY - MAT_HH];
  const R: [number, number] = [MAT_CX + MAT_HW, MAT_CY];
  const B: [number, number] = [MAT_CX, MAT_CY + MAT_HH];
  ctx.lineWidth = 2.5;
  for (let i = 0; i < ROPE_H.length; i++) {
    const h = ROPE_H[i];
    if (h === undefined) continue;
    ctx.strokeStyle = ROPE_COLORS[i] ?? "#8890b0";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    if (back) {
      ctx.moveTo(T[0], T[1] - h);
      ctx.lineTo(L[0], L[1] - h);
      ctx.moveTo(T[0], T[1] - h);
      ctx.lineTo(R[0], R[1] - h);
    } else {
      ctx.moveTo(L[0], L[1] - h);
      ctx.lineTo(B[0], B[1] - h);
      ctx.moveTo(B[0], B[1] - h);
      ctx.lineTo(R[0], R[1] - h);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!back) {
    return;
  }
  // Pali d'angolo (sul lato visibile)
  ctx.strokeStyle = "#8890b0";
  ctx.lineWidth = 3;
  for (const [cx, cy] of [L, T, R, B] as const) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - POST_H);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(cx, cy - POST_H + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function findActive(events: readonly MatchEvent[], tMs: number): MatchEvent | null {
  for (const e of events) {
    if (tMs >= e.t && tMs < e.t + e.durMs) return e;
  }
  return null;
}

function lastStarted(events: readonly MatchEvent[], tMs: number): MatchEvent | null {
  let last: MatchEvent | null = null;
  for (const e of events) {
    if (e.t <= tMs) last = e;
  }
  return last;
}

interface Desire {
  sample: PoseSample | null;
  flip: 1 | -1;
  follow: boolean;
}

function trackFor(event: MatchEvent, side: Side): Track {
  return event.actor === side ? CHOREO[event.kind].actor : CHOREO[event.kind].target;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  pixelW: number,
  pixelH: number,
  result: MatchResult,
  tMs: number,
  scene: SceneState,
  dtMs: number,
  wallMs: number
): void {
  const scale = Math.min(pixelW / SCENE_W, pixelH / SCENE_H);
  const ox = (pixelW - SCENE_W * scale) / 2;
  const oy = (pixelH - SCENE_H * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pixelW, pixelH);
  ctx.setTransform(scale, 0, 0, scale, ox, oy);

  drawRingBackground(ctx);

  const events = result.events;
  const active = findActive(events, tMs);
  const last = lastStarted(events, tMs);

  // Aggiorna le pose di riposo memorizzate.
  if (last) {
    for (const side of [0, 1] as const) {
      const track = trackFor(last, side);
      const rest = restingSample(track);
      if (rest) {
        scene.resting[side] = { sample: rest, flip: last.actor === 0 ? 1 : -1 };
      }
    }
  }

  const desires: [Desire, Desire] = [
    { sample: null, flip: 1, follow: false },
    { sample: null, flip: -1, follow: false },
  ];
  for (const side of [0, 1] as const) {
    if (active) {
      const track = trackFor(active, side);
      const flip: 1 | -1 = active.actor === 0 ? 1 : -1;
      const sample = sampleTrack(track, tMs - active.t);
      if (sample) {
        desires[side] = { sample, flip, follow: side === active.actor && !!track.follow };
        continue;
      }
    }
    const rest = scene.resting[side];
    if (rest) {
      desires[side] = { sample: rest.sample, flip: rest.flip, follow: false };
    }
  }

  const maxStepX = 0.11 * dtMs;
  const maxStepY = 0.18 * dtMs;
  for (const side of [0, 1] as const) {
    const d = desires[side];
    const pos = scene.pos[side];
    const homeX = MAT_CX + (side === 0 ? -SLOT_DX : SLOT_DX);
    let targetX: number;
    if (d.follow) {
      targetX = scene.pos[side === 0 ? 1 : 0].x;
    } else if (d.sample && d.sample.hold) {
      targetX = pos.x;
    } else {
      targetX = homeX + (d.sample ? d.sample.dx * d.flip : 0);
    }
    const step = Math.max(-maxStepX, Math.min(maxStepX, targetX - pos.x));
    pos.x += step;
    const targetY = d.sample ? -d.sample.dy : 0;
    const stepY = Math.max(-maxStepY, Math.min(maxStepY, targetY - pos.y));
    pos.y += stepY;
  }

  drawRopes(ctx, true);

  for (const side of [0, 1] as const) {
    const d = desires[side];
    const def = result.wrestlers[side];
    const facing = side === 0 ? 1 : -1;
    const frame = d.sample ? d.sample.frame : POSES.idle;
    drawWrestler(ctx, def, frame, scene.pos[side].x, scene.pos[side].y, facing, wallMs);
  }

  drawRopes(ctx, false);
}
