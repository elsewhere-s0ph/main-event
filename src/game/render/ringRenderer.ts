import type { MatchEvent, MatchResult, Side, WrestlerDef } from "../types/match";
import { CHOREO, MOVE_CHOREO, POSES, restingSample, sampleTrack, type PoseFrame, type PoseSample, type Track } from "./poses";

// Renderer del ring isometrico: canvas 2D puro, scena logica 480×300
// ridisegnata ogni frame e scalata per riempire lo spazio disponibile.
// Edizione "HD 16-bit": i wrestler sono pixel art procedurale multi-tono
// (outline nero marcato, pelle a 5 toni, trunks con orlo, stivali con
// lacci, sleeve di tatuaggi opzionali) disegnati dalle STESSE pose
// chiave + tween del Documento Master §6: cambia solo il passetto di
// disegno, non l'interfaccia pose+tween né le coreografie.
// Gli sprite quantizzati (angoli arrotondati a 0.05 rad) vengono
// memoizzati su canvas offscreen: il costo per frame resta costante.

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

// Costanti del corpo HD (powerhouse). La lunghezza dei segmenti scala
// con la corporatura (cruiserweight 0.92).
const BODY = { spine: 23, ua: 15, fa: 14, thigh: 18, shin: 17 };
const OUTLINE = "#0d0704";
const HAIR = "#241c33";
const SKULL_BONE = "#e8e2d2";
const TATTOO_INK = "#1c1010";
const BOOT = { black: "#16161a", dark: "#0a0a0d", grey: "#3f3f46", lace: "#9ca3af" };

// Ancoraggi dello sprite offscreen.
const SPR_W = 150;
const SPR_H = 180;
const SPR_ANCHOR_X = 75;
const SPR_ANCHOR_Y = 104;

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
  const c = (i: number) => Math.min(255, Math.round(parseInt(n.slice(i, i + 2), 16) * factor));
  return `rgb(${c(0)}, ${c(2)}, ${c(4)})`;
}

interface SkinRamp {
  shadow2: string;
  shadow1: string;
  base: string;
  light: string;
  spec: string;
}

function skinRamp(hex: string): SkinRamp {
  return {
    shadow2: shade(hex, 0.55),
    shadow1: shade(hex, 0.72),
    base: hex,
    light: shade(hex, 1.22),
    spec: shade(hex, 1.42),
  };
}

interface MaterialRamp {
  shadow: string;
  base: string;
  light: string;
}

// ------------------------------------------------------------------
// Primitve pixel (integer-snapped)
// ------------------------------------------------------------------

function pRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Rect con range orizzontale locale [a, b) rispetto ad x, specchiato col facing.
function mRect(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, h: number, color: string, f: number): void {
  const left = f === 1 ? x + a : x - b;
  pRect(ctx, left, y, b - a, h, color);
}

function pCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const rr = Math.round(r);
  const rr2 = rr * rr + rr * 0.4;
  ctx.fillStyle = color;
  for (let dy = -rr; dy <= rr; dy++) {
    const dx = Math.floor(Math.sqrt(rr2 - dy * dy));
    if (dx >= 0) ctx.fillRect(x - dx, y + dy, dx * 2 + 1, 1);
  }
}

// ------------------------------------------------------------------
// Arti, torso e testa in pixel art multi-tono
// ------------------------------------------------------------------

function drawHDLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rStart: number,
  rEnd: number,
  colors: MaterialRamp,
  tattoo: boolean
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const steps = Math.max(2, Math.ceil(len * 1.4));
  const nx = -dy / len;

  // Pass 1: outline nero marcato
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rad = rStart + (rEnd - rStart) * t;
    pCircle(ctx, x0 + dx * t, y0 + dy * t, rad + 1, OUTLINE);
  }
  // Pass 2: ombra
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rad = rStart + (rEnd - rStart) * t;
    pCircle(ctx, x0 + dx * t, y0 + dy * t, rad, colors.shadow);
  }
  // Pass 3: tono medio verso la luce
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const rad = Math.max(1, rStart + (rEnd - rStart) * t - 0.7);
    pCircle(ctx, x0 + dx * t + nx * 0.6, y0 + dy * t - 0.6, rad, colors.base);
  }
  // Pass 4: riflesso muscolare/tessuto
  for (let i = 2; i < steps - 1; i++) {
    const t = i / steps;
    const swell = Math.sin(t * Math.PI);
    const rad = (rStart + (rEnd - rStart) * t) * 0.48 * swell;
    if (rad >= 0.9) pCircle(ctx, x0 + dx * t + nx * 1.1, y0 + dy * t - 1.1, rad, colors.light);
  }
  // Pass 5: sleeve di tatuaggi a teschi
  if (tattoo) {
    for (let i = 2; i < steps - 2; i += 2) {
      const t = i / steps;
      const px = Math.round(x0 + dx * t);
      const py = Math.round(y0 + dy * t);
      pRect(ctx, px - 1, py - 1, 2, 2, TATTOO_INK);
      if (i % 6 === 2) {
        pRect(ctx, px - 1, py - 2, 3, 3, SKULL_BONE);
        pRect(ctx, px - 1, py - 1, 1, 1, TATTOO_INK);
        pRect(ctx, px + 1, py - 1, 1, 1, TATTOO_INK);
        pRect(ctx, px, py + 1, 1, 1, TATTOO_INK);
      }
    }
  }
}

// Stivale da ring nero con lacci; con la gamba in spinta orizzontale
// (calcio) la suola diventa la superficie d'impatto.
function drawHDBoot(ctx: CanvasRenderingContext2D, fx: number, fy: number, angle: number, f: number): void {
  const x = Math.round(fx);
  const y = Math.round(fy);
  if (angle > 1.0) {
    mRect(ctx, x, y - 8, -3, 6, 14, OUTLINE, f);
    mRect(ctx, x, y - 7, -2, 4, 12, BOOT.black, f);
    mRect(ctx, x, y - 7, -2, 0, 12, BOOT.dark, f);
    mRect(ctx, x, y - 5, 0, 3, 1, BOOT.lace, f);
    mRect(ctx, x, y - 2, 0, 3, 1, BOOT.lace, f);
    mRect(ctx, x, y + 1, 0, 3, 1, BOOT.lace, f);
    mRect(ctx, x, y - 7, 4, 6, 12, BOOT.grey, f);
    mRect(ctx, x, y - 6, 5, 6, 10, BOOT.lace, f);
  } else {
    mRect(ctx, x, y - 5, -4, 10, 10, OUTLINE, f);
    mRect(ctx, x, y - 4, -3, 9, 7, BOOT.black, f);
    mRect(ctx, x, y - 6, -4, 2, 3, BOOT.dark, f);
    mRect(ctx, x, y - 3, 1, 4, 1, BOOT.lace, f);
    mRect(ctx, x, y - 1, 2, 5, 1, BOOT.lace, f);
    mRect(ctx, x, y + 1, 1, 4, 1, BOOT.lace, f);
    mRect(ctx, x, y - 2, 7, 9, 3, BOOT.grey, f);
    mRect(ctx, x, y + 2, -3, 9, 2, BOOT.dark, f);
    mRect(ctx, x, y + 3, -3, 9, 1, OUTLINE, f);
  }
}

// Torso scolpito: pettorali, schiena a V, tagli addominali, trapezi.
function drawHDTorso(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  chestX: number,
  chestY: number,
  f: number,
  skin: SkinRamp
): void {
  drawHDLimb(ctx, hipX, hipY, chestX, chestY, 7, 10, { shadow: skin.shadow1, base: skin.base, light: skin.light }, false);

  const dx = chestX - hipX;
  const dy = chestY - hipY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const fx = -uy * f;
  const fy = ux * f;

  // Pettorali
  const pecX = hipX + ux * (len * 0.72) + fx * 2.5;
  const pecY = hipY + uy * (len * 0.72) + fy * 2.5;
  pCircle(ctx, pecX, pecY, 4.8, skin.shadow1);
  pCircle(ctx, pecX, pecY - 0.8, 4, skin.light);
  mRect(ctx, pecX, pecY - 2, 1, 3, 2, skin.spec, f);
  pRect(ctx, pecX - 2, pecY + 2, 4, 1, skin.shadow2);

  // Addominali
  for (let row = 0; row < 3; row++) {
    const t = 0.22 + row * 0.16;
    const abX = hipX + ux * (len * t) + fx * 3;
    const abY = hipY + uy * (len * t) + fy * 3;
    pRect(ctx, abX - 2, abY - 1, 5, 3, skin.shadow2);
    mRect(ctx, abX, abY - 1, -1, 1, 2, skin.light, f);
    mRect(ctx, abX, abY - 1, 2, 4, 2, skin.base, f);
  }

  // Trapezi / base del collo
  pCircle(ctx, chestX + ux * 2, chestY + uy * 2, 4.2, skin.shadow1);
  pCircle(ctx, chestX + ux * 2.4, chestY + uy * 2.4, 3, skin.base);
}

// Testa: cranio rapato con riflesso o capelli, arcata pesante, mascella squadrate.
function drawHDHead(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  headTilt: number,
  f: number,
  skin: SkinRamp,
  bald: boolean
): void {
  // Collo possente
  pRect(ctx, hx - 4, hy + 2, 7, 6, OUTLINE);
  pRect(ctx, hx - 3, hy + 2, 5, 5, skin.shadow1);

  // Cranio e mandibola
  pCircle(ctx, hx, hy - 2, 8, OUTLINE);
  pRect(ctx, hx - 5, hy - 7, 12, 12, OUTLINE);
  pCircle(ctx, hx, hy - 2, 7, skin.shadow1);
  pRect(ctx, hx - 4, hy - 6, 10, 10, skin.base);
  pRect(ctx, hx - 2, hy - 5, 7, 6, skin.light);

  if (bald) {
    const shineY = hy - 8 + Math.round(headTilt * 3);
    mRect(ctx, hx, shineY, -3, 1, 2, skin.spec, f);
    mRect(ctx, hx, shineY - 1, -1, 1, 1, skin.spec, f);
  } else {
    pRect(ctx, hx - 5, hy - 9, 12, 4, HAIR);
    pRect(ctx, hx - 6, hy - 8, 2, 4, HAIR);
    pRect(ctx, hx + 6, hy - 8, 2, 4, HAIR);
  }

  // Orecchio
  mRect(ctx, hx, hy - 2, -5, -3, 3, skin.shadow1, f);

  // Arcata sopraccigliare + occhio
  mRect(ctx, hx, hy - 5, -1, 4, 1, OUTLINE, f);
  mRect(ctx, hx, hy - 4, 1, 4, 2, "#f8fafc", f);
  mRect(ctx, hx, hy - 4, 3, 4, 2, OUTLINE, f);

  // Naso
  mRect(ctx, hx, hy - 2, 3, 6, 2, skin.spec, f);

  // Mascella squadrate e bocca
  pRect(ctx, hx - 3, hy + 3, 5, 2, skin.shadow2);
  mRect(ctx, hx, hy + 1, 2, 4, 1, skin.shadow2, f);
}

// ------------------------------------------------------------------
// Sprite memoizzato: un wrestler HD disegnato una volta per posa quantizzata
// ------------------------------------------------------------------

const spriteCache = new Map<string, HTMLCanvasElement>();

function quantize(v: number): number {
  return Math.round(v * 20) / 20;
}

function wrestlerSprite(def: WrestlerDef, frame: PoseFrame, facing: number): HTMLCanvasElement {
  const key = [
    def.id, def.colors.skin, def.colors.trim, facing,
    quantize(frame.hip), quantize(frame.lean), quantize(frame.headTilt),
    quantize(frame.armFar[0]), quantize(frame.armFar[1]),
    quantize(frame.armNear[0]), quantize(frame.armNear[1]),
    quantize(frame.legFar[0]), quantize(frame.legFar[1]),
    quantize(frame.legNear[0]), quantize(frame.legNear[1]),
  ].join("|");
  const hit = spriteCache.get(key);
  if (hit) return hit;
  if (spriteCache.size > 400) spriteCache.clear();

  const cv = document.createElement("canvas");
  cv.width = SPR_W;
  cv.height = SPR_H;
  const sctx = cv.getContext("2d");
  if (sctx) drawWrestlerSprite(sctx, def, frame, facing);
  spriteCache.set(key, cv);
  return cv;
}

function drawWrestlerSprite(ctx: CanvasRenderingContext2D, def: WrestlerDef, frame: PoseFrame, facing: number): void {
  const skin = skinRamp(def.colors.skin);
  const skinDark: MaterialRamp = { shadow: skin.shadow2, base: skin.shadow1, light: skin.base };
  const skinFront: MaterialRamp = { shadow: skin.shadow1, base: skin.base, light: skin.light };
  const trim = def.colors.trim;
  const trunkBack: MaterialRamp = { shadow: shade(trim, 0.32), base: shade(trim, 0.45), light: shade(trim, 0.7) };
  const trunkFront: MaterialRamp = { shadow: shade(trim, 0.45), base: trim, light: shade(trim, 1.25) };
  const tattoo = def.tattoo === "skull";
  const bald = def.bald === true;
  const s = def.bodyType === "heavyweight" ? 1 : 0.92;
  const f = facing;

  const hipX = SPR_ANCHOR_X;
  const hipY = SPR_ANCHOR_Y;
  const jp = (ox: number, oy: number, a: number, len: number): [number, number] => [
    ox + Math.sin(a) * len * s * f,
    oy + Math.cos(a) * len * s,
  ];

  const chestX = hipX + Math.sin(frame.lean) * BODY.spine * s * f;
  const chestY = hipY - Math.cos(frame.lean) * BODY.spine * s;
  const headA = frame.lean + frame.headTilt;
  const headX = chestX + Math.sin(headA) * 11 * f;
  const headY = chestY - Math.cos(headA) * 11 * s;

  // Braccio lontano (con sleeve)
  const lSh = frame.armFar[0] + frame.lean * 0.35;
  const [lEx, lEy] = jp(chestX, chestY, lSh, BODY.ua);
  const [lHx, lHy] = jp(lEx, lEy, lSh + frame.armFar[1], BODY.fa);
  drawHDLimb(ctx, chestX, chestY, lEx, lEy, 5, 4.2, skinDark, tattoo);
  drawHDLimb(ctx, lEx, lEy, lHx, lHy, 4, 3, skinDark, tattoo);
  pCircle(ctx, lHx, lHy, 4.4, OUTLINE);
  pCircle(ctx, lHx, lHy, 3.4, skin.shadow1);

  // Gamba lontana: quad + polpetto nudi, tronchino con orlo, stivale
  const lHipX = hipX - 2 * f;
  const [lKx, lKy] = jp(lHipX, hipY + 1, frame.legFar[0], BODY.thigh);
  const [lFx, lFy] = jp(lKx, lKy, frame.legFar[0] + frame.legFar[1], BODY.shin);
  drawHDLimb(ctx, lHipX, hipY + 1, lKx, lKy, 5.8, 4.6, skinDark, false);
  drawHDLimb(ctx, lKx, lKy, lFx, lFy, 4.2, 3, skinDark, false);
  const [lHemX, lHemY] = jp(lHipX, hipY + 1, frame.legFar[0], BODY.thigh * 0.45);
  drawHDLimb(ctx, lHipX, hipY + 1, lHemX, lHemY, 6.4, 5.4, trunkBack, false);
  pCircle(ctx, lHemX, lHemY, 5, shade(trim, 0.7));
  drawHDBoot(ctx, lFx, lFy, frame.legFar[0] + frame.legFar[1], f);

  // Torso scolpito
  drawHDTorso(ctx, hipX, hipY, chestX, chestY, f, skin);

  // Bacino + cintura con banda acceso
  pCircle(ctx, hipX, hipY + 1, 7.8, OUTLINE);
  pCircle(ctx, hipX, hipY + 1, 6.8, shade(trim, 0.45));
  const beltDx = Math.cos(frame.lean) * 7 * f;
  const beltDy = Math.sin(frame.lean) * 7;
  drawHDLimb(
    ctx,
    hipX - beltDx * 0.7, hipY - beltDy * 0.7 - 2,
    hipX + beltDx * 0.8, hipY + beltDy * 0.8 - 2,
    1.6, 1.6,
    { shadow: shade(trim, 0.8), base: trim, light: shade(trim, 1.25) },
    false
  );
  mRect(ctx, hipX, hipY - 3, 3, 6, 3, shade(trim, 1.25), f);

  // Gamba vicina
  const rHipX = hipX + 1 * f;
  const [rKx, rKy] = jp(rHipX, hipY + 2, frame.legNear[0], BODY.thigh);
  const [rFx, rFy] = jp(rKx, rKy, frame.legNear[0] + frame.legNear[1], BODY.shin);
  drawHDLimb(ctx, rHipX, hipY + 2, rKx, rKy, 6.2, 5, skinFront, false);
  drawHDLimb(ctx, rKx, rKy, rFx, rFy, 4.5, 3.2, skinFront, false);
  const [rHemX, rHemY] = jp(rHipX, hipY + 2, frame.legNear[0], BODY.thigh * 0.45);
  drawHDLimb(ctx, rHipX, hipY + 2, rHemX, rHemY, 6.8, 5.8, trunkFront, false);
  pCircle(ctx, rHemX, rHemY, 5.2, trim);
  mRect(ctx, rHemX, rHemY - 1, -2, 0, 2, shade(trim, 1.35), f);
  drawHDBoot(ctx, rFx, rFy, frame.legNear[0] + frame.legNear[1], f);

  // Testa
  drawHDHead(ctx, headX, headY, frame.headTilt, f, skin, bald);

  // Braccio vicino (con sleeve e pugno chiuso)
  const rShX = chestX - Math.cos(frame.lean) * 2 * f;
  const rShY = chestY - Math.sin(frame.lean) * 2 + 1;
  const rSh = frame.armNear[0] + frame.lean * 0.35;
  const [rEx, rEy] = jp(rShX, rShY, rSh, BODY.ua);
  const [rHx, rHy] = jp(rEx, rEy, rSh + frame.armNear[1], BODY.fa);
  drawHDLimb(ctx, rShX, rShY, rEx, rEy, 5.4, 4.4, skinFront, tattoo);
  drawHDLimb(ctx, rEx, rEy, rHx, rHy, 4.2, 3.2, skinFront, tattoo);
  pCircle(ctx, rHx, rHy, 4.6, OUTLINE);
  pCircle(ctx, rHx, rHy, 3.6, skin.base);
  mRect(ctx, rHx, rHy - 2, 0, 2, 2, skin.spec, f);
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
  // Ombra sul mat
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 4, 26 - lift * 0.08, 7 - lift * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Molleggio quantizzato: stabile dentro lo stesso spicchio da 60 ms,
  // così la cache degli sprite non viene invalidata a ogni frame.
  const bob = Math.sin(Math.round(wallMs / 60) * 60 / 420) * 1.1;
  const ground = GROUND_Y - lift + bob;
  const spr = wrestlerSprite(def, frame, facing);
  ctx.drawImage(spr, Math.round(x - SPR_ANCHOR_X), Math.round(ground - (SPR_ANCHOR_Y + frame.hip)));
}

// ------------------------------------------------------------------
// Ring isometrico (invariato)
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Timeline → scena (invariato)
// ------------------------------------------------------------------

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

// Eventi "da tappeto": l'engine li emette con actor = il wrestler
// interessato (quello che cade, si rialza o spalanca le spalle), che nella
// coreografia ricopre il ruolo di "target" (chi incassa la situazione).
const FLOOR_KINDS: ReadonlySet<EventKind> = new Set<EventKind>(["knockdown", "getup", "kickout"]);

function trackFor(event: MatchEvent, side: Side): Track {
  // La coreografia dedicata della mossa (se esiste) precede quella per tipo.
  const specific = event.moveId ? MOVE_CHOREO[event.moveId] : undefined;
  const choreo = specific ?? CHOREO[event.kind];
  const onTarget = FLOOR_KINDS.has(event.kind) ? side === event.actor : side !== event.actor;
  return onTarget ? choreo.target : choreo.actor;
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
  ctx.imageSmoothingEnabled = false;

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

  const maxStepX = 0.16 * dtMs;
  const maxStepY = 0.22 * dtMs;
  for (const side of [0, 1] as const) {
    const d = desires[side];
    const pos = scene.pos[side];
    const homeX = MAT_CX + (side === 0 ? -SLOT_DX : SLOT_DX);
    let targetX: number;
    if (d.follow) {
      targetX = scene.pos[side === 0 ? 1 : 0].x + (d.sample ? d.sample.dx * d.flip : 0);
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
