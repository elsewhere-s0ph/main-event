import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { contractStatus } from "../../game/core/contracts";
import { DAY_LABELS, DEFAULT_COLORS, PHILOSOPHY_LABELS } from "../../game/core/federation";
import { nextShowDate } from "../../game/core/booking";
import Crest from "../federation/Crest";
import styles from "./Dashboard.module.css";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

function bodyTypeLabel(bodyType: string): string {
  return bodyType === "heavyweight" ? "pesi massimi" : "pesi leggeri";
}

function alignmentLabel(alignment: string): string {
  return alignment === "face" ? "beniamino" : "cattivo";
}

export default function Dashboard() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const roster = useCareerStore((s) => s.roster);
  const titles = useCareerStore((s) => s.titles);
  const open = useCareerStore((s) => s.open);

  useEffect(() => {
    if (saveId) void open(saveId);
  }, [saveId, open]);

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link to="/">← Tutte le federazioni</Link>
      </div>
    );
  }

  const payroll = roster.reduce((sum, w) => sum + w.contract.weeklyPay, 0);
  const shows = current.shows ?? [];
  const upcoming = nextShowDate(shows, current.inGameDate);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Federazioni
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Crest
            name={current.federationName}
            colors={current.colors ?? DEFAULT_COLORS}
            logo={current.logo ?? null}
            size={44}
          />
          <h1>{current.federationName}</h1>
        </div>
        <p className={styles.muted}>Benvenuto in federazione, GM {current.gmName}.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Federazione</h2>
          <p>
            <strong>{PHILOSOPHY_LABELS[current.philosophy ?? "spettacolare"]}</strong> — filosofia
            di booking
          </p>
          <ul className={styles.rosterList}>
            {shows.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong> — {DAY_LABELS[s.day] ?? "giorno da definire"}
              </li>
            ))}
            {shows.length === 0 && <li>Nessuno show programmato, per ora.</li>}
          </ul>
          <Link to={`/career/${saveId}/federation`} className="btn btn-primary">
            Gestisci identità
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Salvataggio</h2>
          <dl className={styles.dl}>
            <dt>Seed</dt>
            <dd>{current.seed}</dd>
            <dt>Versione schema</dt>
            <dd>{current.schemaVersion}</dd>
            <dt>Versione app</dt>
            <dd>{current.gameVersion}</dd>
            <dt>Creata</dt>
            <dd>{formatDate(current.createdAt)}</dd>
            <dt>Ultimo salvataggio</dt>
            <dd>{formatDate(current.updatedAt)}</dd>
            <dt>Data di gioco</dt>
            <dd>{current.inGameDate}</dd>
          </dl>
          <p className={styles.muted}>
            Ogni modifica viene salvata subito su questo dispositivo. Nessun account, nessun
            server.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Roster ({roster.length})</h2>
          <ul className={styles.rosterList}>
            {roster.map((w) => {
              const status = contractStatus(w.contract, current.inGameDate);
              return (
                <li key={w.id}>
                  <Link className={styles.rosterLink} to={`/career/${saveId}/wrestler/${w.id}`}>
                    <strong>{w.name}</strong> — {w.nickname}{" "}
                    <span className={styles.tag}>
                      · {alignmentLabel(w.alignment)} · {bodyTypeLabel(w.bodyType)}
                    </span>
                    {status !== "attivo" && (
                      <span className={status === "scaduto" ? styles.tagDanger : styles.tagWarn}>
                        {" "}· contratto {status}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className={styles.payroll}>
            Massa salariale: {payroll.toLocaleString("it-IT")} a settimana.
          </p>
          <p className={styles.muted}>
            Il roster nasce dal seed della federazione: stesso seed, stessi atleti. Tocca un
            atleta per aprire la sua scheda.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Titoli e albi d’oro</h2>
          <ul className={styles.rosterList}>
            {titles.map((t) => {
              const champ = roster.find((w) => w.id === t.currentChampionId);
              return (
                <li key={t.id}>
                  <Link className={styles.rosterLink} to={`/career/${saveId}/titles`}>
                    <strong>{t.name}</strong> — {champ ? champ.name : "vacante"}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className={styles.muted}>
            Chi regna adesso e chi ha regnato prima: tocca per gestire i titoli e scrivere la
            storia della federazione.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Booking &amp; show</h2>
          {upcoming ? (
            <p>
              <strong>{upcoming.name}</strong> — prossima puntata: {upcoming.date}
            </p>
          ) : (
            <p>Nessuno show in calendario.</p>
          )}
          <p className={styles.muted}>
            Componi la card: match, segmenti e rivalità. Quando registri lo show, il tempo avanza
            e i titoli si difendono.
          </p>
          <Link to={`/career/${saveId}/booking`} className="btn btn-primary">
            Vai al booking
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Il motore (demo)</h2>
          <p className={styles.muted}>
            Il prototipo del motore è pronto: due wrestler sul ring isometrico, un incontro
            che si anima da solo. Stesso seed, identico spettacolo.
          </p>
          <Link to="/match" className="btn btn-primary">
            Guarda il match dimostrativo
          </Link>
        </section>
      </div>
    </div>
  );
}
