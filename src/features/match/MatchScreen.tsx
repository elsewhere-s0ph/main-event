import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DEMO_WRESTLERS } from "../../game/engine/demoRoster";
import { simulateMatch } from "../../game/engine/matchEngine";
import type { MatchEvent } from "../../game/types/match";
import { createScene, drawFrame } from "../../game/render/ringRenderer";
import styles from "./MatchScreen.module.css";

const SPEEDS = [0.5, 1, 2, 4] as const;

interface UiState {
  energy: readonly [number, number];
  feed: readonly { id: number; text: string }[];
}

function computeUi(events: readonly MatchEvent[], tMs: number): UiState {
  let energy: readonly [number, number] = [100, 100];
  const feed: { id: number; text: string }[] = [];
  for (const e of events) {
    // Cronaca ed energia mostrano l'evento al suo impatto (impactMs), non
    // all'inizio: il testo arriva quando il colpo visivamente atterra.
    if (e.t + (e.impactMs ?? 0) > tMs) break;
    energy = e.energyAfter;
    feed.push({ id: e.id, text: e.text });
  }
  return { energy, feed: feed.slice(-5) };
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MatchScreen() {
  const [params, setParams] = useSearchParams();
  const seed = params.get("seed") ?? "main-event";
  const result = useMemo(() => simulateMatch(DEMO_WRESTLERS, seed), [seed]);

  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [finished, setFinished] = useState(false);
  const [ui, setUi] = useState<UiState>(() => computeUi(result.events, 0));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef(0);
  const doneRef = useRef(false);
  const sceneRef = useRef(createScene());
  const playRef = useRef(true);
  const speedRef = useRef<number>(SPEEDS[1]);

  useEffect(() => {
    playRef.current = playing;
  }, [playing]);

  useEffect(() => {
    speedRef.current = SPEEDS[speedIdx];
  }, [speedIdx]);

  // Reset della riproduzione a ogni nuovo incontro (nuovo seed).
  useEffect(() => {
    tRef.current = 0;
    doneRef.current = false;
    sceneRef.current = createScene();
    setFinished(false);
    setPlaying(true);
    setUi(computeUi(result.events, 0));
  }, [result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (playRef.current && !doneRef.current) {
        tRef.current = Math.min(tRef.current + dt * speedRef.current, result.durationMs);
        if (tRef.current >= result.durationMs) {
          doneRef.current = true;
          setFinished(true);
        }
      }
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      drawFrame(ctx, w, h, result, tRef.current, sceneRef.current, dt, now);
      if (now - lastUi > 120) {
        lastUi = now;
        setUi(computeUi(result.events, tRef.current));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const replay = () => {
    tRef.current = 0;
    doneRef.current = false;
    sceneRef.current = createScene();
    setFinished(false);
    setPlaying(true);
    setUi(computeUi(result.events, 0));
  };

  const newMatch = () => {
    const s = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
    setParams({ seed: s });
  };

  const [wa, wb] = result.wrestlers;
  const winner = result.wrestlers[result.winner];
  const loser = result.wrestlers[result.winner === 0 ? 1 : 0];
  const lastUi = ui.feed[ui.feed.length - 1];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Federazioni
        </Link>
        <h1>Match dimostrativo</h1>
        <p className={styles.muted}>
          Prototipo del motore: stesso seed, identico spettacolo. Seed: <code>{seed}</code> · build 2026-11-11·2
        </p>
      </header>

      <div className={styles.hud}>
        <div className={styles.side}>
          <span className={styles.name}>{wa.name}</span>
          <div className={styles.bar}>
            <div
              className={styles.fill}
              style={{ width: `${Math.round(ui.energy[0])}%` }}
              data-low={ui.energy[0] < 30}
            />
          </div>
        </div>
        <span className={styles.vs}>VS</span>
        <div className={styles.sideRight}>
          <span className={styles.name}>{wb.name}</span>
          <div className={styles.bar}>
            <div
              className={styles.fillRight}
              style={{ width: `${Math.round(ui.energy[1])}%` }}
              data-low={ui.energy[1] < 30}
            />
          </div>
        </div>
      </div>

      <div className={styles.stageWrap}>
        <canvas ref={canvasRef} className={styles.stage} aria-label="Ring isometrico con il match in corso" />
        {lastUi && !finished && (
          <p className={styles.caption} key={lastUi.id}>
            {lastUi.text}
          </p>
        )}
        {finished && (
          <div className={styles.overlay} role="dialog" aria-label="Risultato">
            <p className={styles.kicker}>Fine del match</p>
            <h2 className={styles.winner}>{winner.name}</h2>
            <p className={styles.summary}>{result.summary}</p>
            <p className={styles.muted}>
              {loser.name} non c&apos;è mai riuscito · durata {fmtDuration(result.durationMs)}
            </p>
            <div className={styles.overlayActions}>
              <button type="button" className="btn btn-primary" onClick={replay}>
                Rivedi
              </button>
              <button type="button" className="btn btn-primary" onClick={newMatch}>
                Nuovo incontro
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setPlaying((v) => !v)}
          disabled={finished}
        >
          {playing ? "Pausa" : "Riprendi"}
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
        >
          Velocità {SPEEDS[speedIdx]}×
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            tRef.current = result.durationMs;
            doneRef.current = true;
            setFinished(true);
          }}
          disabled={finished}
        >
          Salta al risultato
        </button>
      </div>

      <section className={styles.feedCard} aria-label="Cronaca">
        <h2>Cronaca · build 2026-11-11·2</h2>
        <ul className={styles.feed}>
          {ui.feed.map((f, i) => (
            <li key={f.id} className={i === ui.feed.length - 1 ? styles.latest : undefined}>
              {f.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
