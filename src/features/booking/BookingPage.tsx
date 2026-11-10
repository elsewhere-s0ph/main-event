import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { useBookingStore } from "../../stores/bookingStore";
import { DAY_LABELS } from "../../game/core/federation";
import {
  MAX_CARD_ITEMS,
  SEGMENT_KINDS,
  SEGMENT_LABELS,
  nextShowDate,
} from "../../game/core/booking";
import { PHASE_LABELS } from "../../game/core/rivalry";
import type { CardItem, SegmentKind } from "../../game/types/booking";
import type { Rivalry } from "../../game/types/rivalry";
import styles from "./BookingPage.module.css";

// Booking & show (C4): la card si scrive qui, lo show si registra qui.
// La logica vive nei moduli puri e nello store: questa pagina racconta.

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}

function intensityStars(n: number): string {
  return "★".repeat(Math.max(1, Math.min(10, n)));
}

function rivalryNames(r: Rivalry, nameOf: (id: string) => string): string {
  return `${nameOf(r.participants[0])} vs ${nameOf(r.participants[1])}`;
}

export default function BookingPage() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const roster = useCareerStore((s) => s.roster);
  const titles = useCareerStore((s) => s.titles);
  const open = useCareerStore((s) => s.open);

  const cards = useBookingStore((s) => s.cards);
  const results = useBookingStore((s) => s.results);
  const rivalries = useBookingStore((s) => s.rivalries);
  const load = useBookingStore((s) => s.load);
  const saveCardAction = useBookingStore((s) => s.saveCard);
  const createSpecial = useBookingStore((s) => s.createSpecial);
  const deleteSpecial = useBookingStore((s) => s.deleteSpecial);
  const runWeeklyShow = useBookingStore((s) => s.runWeeklyShow);
  const runSpecial = useBookingStore((s) => s.runSpecial);
  const createRivalryAction = useBookingStore((s) => s.createRivalry);
  const resolveRivalryAction = useBookingStore((s) => s.resolveRivalry);

  const [tab, setTab] = useState<string | null>(null);
  const [draft, setDraft] = useState<CardItem[]>([]);
  const [matchA, setMatchA] = useState("");
  const [matchB, setMatchB] = useState("");
  const [matchTitle, setMatchTitle] = useState("");
  const [segKind, setSegKind] = useState<SegmentKind>("promo");
  const [segPros, setSegPros] = useState<string[]>([]);
  const [specialName, setSpecialName] = useState("");
  const [specialDate, setSpecialDate] = useState("");
  const [rivA, setRivA] = useState("");
  const [rivB, setRivB] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saveId) {
      void open(saveId).then((career) => {
        if (career) void load(career.saveId);
      });
    }
  }, [saveId, open, load]);

  const shows = current?.shows ?? [];
  const specials = useMemo(
    () =>
      Object.values(cards)
        .filter((c) => c.isSpecial)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [cards]
  );
  const activeTab = tab ?? shows[0]?.id ?? null;
  const activeShow = shows.find((s) => s.id === activeTab) ?? null;
  const activeSpecial = specials.find((s) => s.showId === activeTab) ?? null;
  const isSpecialTab = Boolean(activeSpecial);
  const upcoming = activeShow ? nextShowDate([activeShow], current?.inGameDate ?? "2027-01-01") : null;
  const lastResult = results.find((r) => r.showId === activeTab) ?? null;

  useEffect(() => {
    setDraft(activeTab ? (cards[activeTab]?.items ?? []) : []);
    setSegPros([]);
    setMatchA("");
    setMatchB("");
    setMatchTitle("");
  }, [activeTab, cards]);

  const nameOf = useMemo(() => {
    const byId = new Map(roster.map((w) => [w.id, w.name] as const));
    return (id: string) => byId.get(id) ?? "sconosciuto";
  }, [roster]);

  const titleOptions = useMemo(
    () =>
      titles.filter(
        (t) =>
          t.currentChampionId &&
          (t.currentChampionId === matchA || t.currentChampionId === matchB)
      ),
    [titles, matchA, matchB]
  );

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link className={styles.back} to={saveId ? `/career/${saveId}` : "/"}>
          ← Torna alla federazione
        </Link>
      </div>
    );
  }

  function addMatch() {
    if (!matchA || !matchB || matchA === matchB) return;
    if (draft.length >= MAX_CARD_ITEMS) return;
    setDraft([
      ...draft,
      {
        kind: "match",
        data: {
          id: `m-${crypto.randomUUID().slice(0, 8)}`,
          type: "singolo",
          wrestlerIds: [matchA, matchB],
          titleId: matchTitle || null,
        },
      },
    ]);
    setMatchA("");
    setMatchB("");
    setMatchTitle("");
  }

  function addSegment() {
    if (segPros.length === 0 || draft.length >= MAX_CARD_ITEMS) return;
    setDraft([
      ...draft,
      {
        kind: "segment",
        data: {
          id: `s-${crypto.randomUUID().slice(0, 8)}`,
          kind: segKind,
          wrestlerIds: [...segPros],
        },
      },
    ]);
    setSegPros([]);
  }

  async function handleSave() {
    if (!activeTab) return;
    setBusy(true);
    const res = await saveCardAction(activeTab, draft);
    setBusy(false);
    setFeedback(res.ok ? { ok: true, text: "Card salvata." } : { ok: false, text: res.error ?? "Errore" });
  }

  async function handleRun() {
    if (!activeTab) return;
    setBusy(true);
    const res = isSpecialTab ? await runSpecial(activeTab) : await runWeeklyShow(activeTab);
    setBusy(false);
    if (res.ok) {
      const r = useBookingStore.getState().results.find((x) => x.showId === activeTab) ?? null;
      setFeedback(
        r
          ? { ok: true, text: `${r.showName} registrato: valutazione ${r.rating}/100. ${r.verdict}` }
          : { ok: true, text: "Show registrato." }
      );
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleCreateSpecial(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await createSpecial(specialName, specialDate);
    setBusy(false);
    if (res.ok) {
      setSpecialName("");
      setSpecialDate("");
      setFeedback({ ok: true, text: "Evento speciale in calendario: ora scrivi la card." });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleDeleteSpecial(showId: string, name: string) {
    if (!window.confirm(`Eliminare l'evento ${name}? La card scritta finisce con lui.`)) return;
    await deleteSpecial(showId);
    if (tab === showId) setTab(null);
    setFeedback({ ok: true, text: "Evento eliminato." });
  }

  async function handleCreateRivalry(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await createRivalryAction(rivA, rivB);
    setBusy(false);
    if (res.ok) {
      setRivA("");
      setRivB("");
      setFeedback({ ok: true, text: "Rivalità aperta: ora fatela vivere negli show." });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleCloseRivalry(r: Rivalry) {
    const names = rivalryNames(r, nameOf);
    if (!window.confirm(`Chiudere la rivalità ${names}? La storia resta nei diari.`)) return;
    setBusy(true);
    await resolveRivalryAction(r.id);
    setBusy(false);
    setFeedback({ ok: true, text: `Rivalità ${names} chiusa.` });
  }

  const activeRivalries = rivalries.filter((r) => r.status === "attiva");
  const resolvedCount = rivalries.length - activeRivalries.length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} to={`/career/${current.saveId}`}>
          ← {current.federationName}
        </Link>
        <h1>Booking &amp; show</h1>
        <p className={styles.muted}>
          Componi la card di ogni show: match e segmenti nell’ordine che vuoi. Quando registri,
          il tempo avanza alla data dello show, i titoli si difendono e le rivalità si muovono.
        </p>
      </header>

      {feedback && (
        <p className={feedback.ok ? styles.feedback : styles.error} role="status">
          {feedback.text}
        </p>
      )}

      <div className={styles.tabs}>
        {shows.map((s) => (
          <button
            key={s.id}
            type="button"
            className={activeTab === s.id ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab(s.id)}
          >
            {s.name} · {DAY_LABELS[s.day] ?? "?"}
          </button>
        ))}
        {specials.map((s) => (
          <button
            key={s.showId}
            type="button"
            className={activeTab === s.showId ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setTab(s.showId)}
          >
            ★ {s.name}
          </button>
        ))}
      </div>

      {activeTab && (activeShow || activeSpecial) && (
        <section className={styles.card}>
          <div className={styles.nextRow}>
            <h2>{activeSpecial ? `★ ${activeSpecial.name}` : activeShow?.name}</h2>
            {upcoming && !isSpecialTab && (
              <span className={styles.nextDate}>Prossima puntata: {fmtDate(upcoming.date)}</span>
            )}
            {activeSpecial?.date && <span className={styles.nextDate}>{fmtDate(activeSpecial.date)}</span>}
          </div>

          {draft.length === 0 ? (
            <p className={styles.muted}>Card vuota: aggiungi un match o un segmento.</p>
          ) : (
            <ul className={styles.items}>
              {draft.map((item, i) => {
                if (item.kind === "match") {
                  const m = item.data;
                  return (
                    <li key={m.id} className={styles.item}>
                      <span className={styles.itemKind}>Match</span>
                      <span className={styles.itemMain}>
                        {nameOf(m.wrestlerIds[0])} vs {nameOf(m.wrestlerIds[1])}
                        {m.titleId && (
                          <span className={styles.itemTitle}>
                            {" "}· {titles.find((t) => t.id === m.titleId)?.name ?? "titolo"} in palio
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label={`Rimuovi match ${i + 1}`}
                        onClick={() => setDraft(draft.filter((x) => x !== item))}
                      >
                        ✕
                      </button>
                    </li>
                  );
                }
                const seg = item.data;
                return (
                  <li key={seg.id} className={styles.item}>
                    <span className={styles.itemKindSegment}>{SEGMENT_LABELS[seg.kind]}</span>
                    <span className={styles.itemMain}>{seg.wrestlerIds.map(nameOf).join(" e ")}</span>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      aria-label={`Rimuovi segmento ${i + 1}`}
                      onClick={() => setDraft(draft.filter((x) => x !== item))}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <h3>Aggiungi un match</h3>
          <div className={styles.formRow}>
            <select
              value={matchA}
              onChange={(e) => setMatchA(e.target.value)}
              aria-label="Primo atleta del match"
            >
              <option value="">Primo atleta…</option>
              {roster.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <span className={styles.muted}>vs</span>
            <select
              value={matchB}
              onChange={(e) => setMatchB(e.target.value)}
              aria-label="Secondo atleta del match"
            >
              <option value="">Secondo atleta…</option>
              {roster.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              value={matchTitle}
              onChange={(e) => setMatchTitle(e.target.value)}
              aria-label="Titolo in palio"
            >
              <option value="">Nessun titolo in palio</option>
              {titleOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} in palio
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.smallBtn}
              onClick={addMatch}
              disabled={!matchA || !matchB || matchA === matchB}
            >
              Aggiungi
            </button>
          </div>
          {matchA && matchB && matchA !== matchB && titleOptions.length === 0 && (
            <p className={styles.muted}>
              Nessun titolo in palio: servirebbe un match col campione in carica.
            </p>
          )}

          <h3>Aggiungi un segmento</h3>
          <div className={styles.segmented} role="group" aria-label="Tipo di segmento">
            {SEGMENT_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className={segKind === k ? styles.active : undefined}
                onClick={() => setSegKind(k)}
              >
                {SEGMENT_LABELS[k]}
              </button>
            ))}
          </div>
          <div className={styles.formRow}>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !segPros.includes(id) && segPros.length < 3) setSegPros([...segPros, id]);
              }}
              aria-label="Aggiungi un protagonista al segmento"
            >
              <option value="">Aggiungi un protagonista…</option>
              {roster.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          {segPros.length > 0 && (
            <div className={styles.chips}>
              {segPros.map((id) => (
                <span key={id} className={styles.chip}>
                  {nameOf(id)}
                  <button
                    type="button"
                    className={styles.removeBtn}
                    aria-label={`Rimuovi ${nameOf(id)} dal segmento`}
                    onClick={() => setSegPros(segPros.filter((p) => p !== id))}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={busy || draft.length === 0}
            >
              Salva la card
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRun}
              disabled={busy || draft.length === 0}
            >
              {isSpecialTab ? "Registra l’evento" : "Registra lo show"}
            </button>
          </div>
          <p className={styles.muted}>
            Registrare usa la card salvata: se hai modifiche in sospeso, salva prima.
          </p>

          {lastResult && (
            <div className={styles.resultBox}>
              <div className={styles.resultHead}>
                <span className={styles.rating}>{lastResult.rating}/100</span>
                <span>{lastResult.verdict}</span>
              </div>
              <ul className={styles.outcomeList}>
                {lastResult.outcomes.map((o, i) => (
                  <li key={i} className={styles.outcome}>
                    <span className={styles.outcomeRating}>{o.rating}</span>
                    <span>
                      {o.kind === "match" ? (
                        <>
                          {nameOf(o.winnerId)} batte {nameOf(o.loserId)}. {o.summary}
                          {o.defense && (
                            <span className={styles.titleNote}> · titolo difeso</span>
                          )}
                          {o.titleChange && (
                            <span className={styles.titleNote}> · titolo cambiato di mani!</span>
                          )}
                        </>
                      ) : (
                        o.text
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className={styles.card}>
        <h2>Eventi speciali</h2>
        <p className={styles.muted}>
          Gli show settimanali bastano, ma le grandi storie si chiudono in una notte a parte.
        </p>
        <form className={styles.stack} onSubmit={handleCreateSpecial}>
          <div className={styles.formRow}>
            <input
              value={specialName}
              onChange={(e) => setSpecialName(e.target.value)}
              maxLength={40}
              placeholder="Es. Notte dei Conti"
              aria-label="Nome dell'evento speciale"
            />
            <input
              type="date"
              value={specialDate}
              min={current.inGameDate}
              onChange={(e) => setSpecialDate(e.target.value)}
              aria-label="Data dell'evento speciale"
            />
            <button
              type="submit"
              className={styles.smallBtn}
              disabled={busy || specialName.trim().length < 2 || !specialDate}
            >
              Crea
            </button>
          </div>
        </form>
        {specials.length > 0 && (
          <ul className={styles.items}>
            {specials.map((s) => (
              <li key={s.showId} className={styles.item}>
                <span className={styles.itemKind}>★ Speciale</span>
                <span className={styles.itemMain}>
                  <strong>{s.name}</strong> — {s.date ? fmtDate(s.date) : "data da definire"}
                </span>
                <button type="button" className={styles.smallBtn} onClick={() => setTab(s.showId)}>
                  Prepara la card
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleDeleteSpecial(s.showId, s.name ?? "")}
                >
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <h2>Rivalità</h2>
        <p className={styles.muted}>
          Una storia alla volta: chi si affronta negli show la fa crescere, e al culmine si chiude
          sul ring.
        </p>
        <form className={styles.formRow} onSubmit={handleCreateRivalry}>
          <select value={rivA} onChange={(e) => setRivA(e.target.value)} aria-label="Primo avversario">
            <option value="">Primo avversario…</option>
            {roster.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <span className={styles.muted}>vs</span>
          <select value={rivB} onChange={(e) => setRivB(e.target.value)} aria-label="Secondo avversario">
            <option value="">Secondo avversario…</option>
            {roster.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={styles.smallBtn}
            disabled={busy || !rivA || !rivB || rivA === rivB}
          >
            Apri la rivalità
          </button>
        </form>

        {activeRivalries.length === 0 ? (
          <p className={styles.muted}>Nessuna rivalità aperta: il roster è un posto tranquillo.</p>
        ) : (
          <div className={styles.stack}>
            {activeRivalries.map((r) => (
              <div key={r.id} className={styles.rivalry}>
                <div className={styles.rivalryHead}>
                  <span className={styles.rivalryNames}>{rivalryNames(r, nameOf)}</span>
                  <span className={styles.phaseTag}>{PHASE_LABELS[r.phase]}</span>
                  <span className={styles.intensity} title={`Intensità ${r.intensity} su 10`}>
                    {intensityStars(r.intensity)}
                  </span>
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => handleCloseRivalry(r)}
                    disabled={busy}
                  >
                    Chiudi la rivalità
                  </button>
                </div>
                <div className={styles.heatBar} title={`Calore del pubblico ${r.heat} su 100`}>
                  <div className={styles.heatFill} style={{ width: `${r.heat}%` }} />
                </div>
                {r.story.length > 0 && (
                  <ul className={styles.story}>
                    {[...r.story].reverse().slice(0, 3).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {resolvedCount > 0 && (
          <p className={styles.muted}>
            {resolvedCount === 1 ? "Una storia chiusa" : `${resolvedCount} storie chiuse`} nei
            diari della federazione.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2>Storico degli show</h2>
        {results.length === 0 ? (
          <p className={styles.muted}>Nessuno show registrato: la storia comincia adesso.</p>
        ) : (
          <ul className={styles.historyList}>
            {results.slice(0, 10).map((r) => (
              <li key={r.id} className={styles.historyRow}>
                <span className={styles.historyRating}>{r.rating}/100</span>
                <strong>{r.showName}</strong>
                <span className={styles.muted}>
                  {fmtDate(r.date)}
                  {r.isSpecial ? " · evento speciale" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
