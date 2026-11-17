import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DEMO_WRESTLERS } from "../../game/engine/demoRoster";
import { simulateMatch } from "../../game/engine/matchEngine";
import { getShowResult } from "../../data/repositories/bookingRepository";
import { toWrestlerDef } from "../../game/types/roster";
import { useCareerStore } from "../../stores/careerStore";
import type { MatchEvent, MatchResult } from "../../game/types/match";
import type { MatchOutcome, ShowResult } from "../../game/types/booking";
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

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}

export default function MatchScreen() {
  const { saveId, resultId } = useParams();
  const [params, setParams] = useSearchParams();

  // Due modalità, stesso motore e stesso schermo:
  // - demo (/match): il prototipo del motore, seed via query;
  // - federazione (/career/:saveId/match/:resultId): si rigioca un match
  //   registrato, con la timeline conservata nell'esito (sistema dei match).
  const isBooked = Boolean(saveId && resultId);
  const outcomeIndex = Math.max(0, Number.parseInt(params.get("n") ?? "0", 10) || 0);

  const seed = params.get("seed") ?? "main-event";
  const demoResult = useMemo(() => simulateMatch(DEMO_WRESTLERS, seed), [seed]);

  const [showResult, setShowResult] = useState<ShowResult | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");
  useEffect(() => {
    if (!resultId) return;
    let alive = true;
    setLoadState("loading");
    setShowResult(null);
    getShowResult(resultId)
      .then((r) => {
        if (!alive) return;
        setShowResult(r);
        setLoadState(r ? "ready" : "missing");
      })
      .catch(() => {
        if (alive) setLoadState("missing");
      });
    return () => {
      alive = false;
    };
  }, [resultId]);

  const bookedOutcome: MatchOutcome | null = useMemo(() => {
    if (!isBooked || !showResult) return null;
    const o = showResult.outcomes[outcomeIndex];
    return o && o.kind === "match" ? o : null;
  }, [isBooked, showResult, outcomeIndex]);

  const bookedResult: MatchResult | null = useMemo(() => {
    if (!bookedOutcome) return null;
    if (bookedOutcome.sim) return bookedOutcome.sim;
    // Risultati registrati prima del sistema dei match: si rigioca dal seed
    // col roster attuale — stesso seed, identico spettacolo (Documento Master §5.2).
    const byId = new Map(useCareerStore.getState().roster.map((w) => [w.id, w] as const));
    const [a, b] = bookedOutcome.match.wrestlerIds.map((id) => byId.get(id));
    if (!a || !b) return null;
    return simulateMatch([toWrestlerDef(a), toWrestlerDef(b)], bookedOutcome.seed);
  }, [bookedOutcome]);

  const result = isBooked ? bookedResult : demoResult;

  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [finished, setFinished] = useState(false);
  const [ui, setUi] = useState<UiState>({ energy: [100, 100], feed: [] });

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

  // Reset della riproduzione a ogni nuovo incontro (timeline diversa).
  useEffect(() => {
    if (!result) return;
    tRef.current = 0;
    doneRef.current = false;
    sceneRef.current = createScene();
    setFinished(false);
    setPlaying(true);
    setUi(computeUi(result.events, 0));
  }, [result]);

  useEffect(() => {
    if (!result) return;
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
    if (!result) return;
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

  if (isBooked && loadState !== "ready") {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <Link to={saveId ? `/career/${saveId}/booking` : "/"} className={styles.back}>
            ← Booking
          </Link>
          <h1>Match</h1>
          <p className={styles.muted}>
            {loadState === "loading"
              ? "Carico il match…"
              : "Risultato non trovato: lo show potrebbe essere stato rimosso."}
          </p>
        </header>
      </div>
    );
  }

  if (!result) {
    // Show caricato ma match non riproducibile sul ring: multi-match (nessuna
    // timeline, per ora) o atleti non più nel roster. Resta la cronaca.
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <Link to={saveId ? `/career/${saveId}/booking` : "/"} className={styles.back}>
            ← Booking
          </Link>
          <h1>{showResult?.showName ?? "Match"}</h1>
          <p className={styles.muted}>{showResult?.date ? fmtDate(showResult.date) : ""}</p>
        </header>
        <section className={styles.feedCard} aria-label="Cronaca">
          <h2>Cronaca</h2>
          <p className={styles.muted}>
            {bookedOutcome?.summary ??
              "Questo incontro non è riproducibile sul ring: i match a più atleti restano solo di cronaca, per ora."}
          </p>
        </section>
      </div>
    );
  }

  const [wa, wb] = result.wrestlers;
  const winner = result.wrestlers[result.winner];
  const loser = result.wrestlers[result.winner === 0 ? 1 : 0];
  const lastUi = ui.feed[ui.feed.length - 1];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {isBooked ? (
          <Link to={`/career/${saveId}/booking`} className={styles.back}>
            ← Booking
          </Link>
        ) : (
          <Link to="/" className={styles.back}>
            ← Federazioni
          </Link>
        )}
        {isBooked ? (
          <>
            <h1>{showResult?.showName ?? "Match"}</h1>
            <p className={styles.muted}>
              {showResult?.date ? `${fmtDate(showResult.date)} · match della card` : "Match della card"}
            </p>
          </>
        ) : (
          <>
            <h1>Match dimostrativo</h1>
            <p className={styles.muted}>
              Prototipo del motore: stesso seed, identico spettacolo. Seed: <code>{seed}</code>
            </p>
          </>
        )}
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
            <p className={styles.summary}>{bookedOutcome?.summary ?? result.summary}</p>
            {bookedOutcome?.defense && <p className={styles.muted}>Titolo difeso con successo.</p>}
            {bookedOutcome?.titleChange && <p className={styles.muted}>Titolo cambiato di mani!</p>}
            <p className={styles.muted}>
              {!bookedOutcome && `${loser.name} non c'è mai riuscito · `}durata{" "}
              {fmtDuration(result.durationMs)}
            </p>
            <div className={styles.overlayActions}>
              <button type="button" className="btn btn-primary" onClick={replay}>
                Rivedi
              </button>
              {!isBooked && (
                <button type="button" className="btn btn-primary" onClick={newMatch}>
                  Nuovo incontro
                </button>
              )}
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
        <h2>Cronaca</h2>
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
