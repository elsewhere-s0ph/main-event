import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { contractStatus } from "../../game/core/contracts";
import { nextShowDate } from "../../game/core/booking";
import styles from "./Dashboard.module.css";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export default function Dashboard() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const roster = useCareerStore((s) => s.roster);
  const open = useCareerStore((s) => s.open);

  useEffect(() => {
    if (saveId) void open(saveId);
  }, [saveId, open]);

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link to="/">← Torna alla home</Link>
      </div>
    );
  }

  const shows = current.shows ?? [];
  const upcoming = nextShowDate(shows, current.inGameDate);
  const expiring = roster
    .map((w) => ({ w, status: contractStatus(w.contract, current.inGameDate) }))
    .filter((x) => x.status !== "attivo")
    .slice(0, 5);

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Prossimo show</h2>
          {upcoming ? (
            <p>
              <strong>{upcoming.name}</strong> — prossima puntata: {upcoming.date}
            </p>
          ) : (
            <p>Nessuno show in calendario.</p>
          )}
          <p className={styles.muted}>
            Componi la card: match, segmenti e rivalità. Quando registri lo show, il tempo avanza e
            i titoli si difendono.
          </p>
          <Link to={`/career/${saveId}/booking`} className="btn btn-primary">
            Vai al booking
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Cassa</h2>
          <p>
            <strong>{(current.finance?.balance ?? 0).toLocaleString("it-IT")}</strong>
          </p>
          <p className={styles.muted}>
            Le rivali si sfidano negli ascolti: ogni show registrato è una settimana di battaglia
            per il pubblico. Nel registro resta ogni euro.
          </p>
          <Link to={`/career/${saveId}/world`} className="btn btn-primary">
            Mondo &amp; ascolti
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Contratti da segnare</h2>
          {expiring.length === 0 ? (
            <p className={styles.muted}>Tutti gli atleti sotto contratto, per ora.</p>
          ) : (
            <ul className={styles.rosterList}>
              {expiring.map(({ w, status }) => (
                <li key={w.id}>
                  <Link className={styles.rosterLink} to={`/career/${saveId}/wrestler/${w.id}`}>
                    <strong>{w.name}</strong>
                    <span className={status === "scaduto" ? styles.tagDanger : styles.tagWarn}>
                      {" "}· contratto {status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to={`/career/${saveId}/roster`} className="btn btn-primary">
            Vai al roster
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Il motore (demo)</h2>
          <p className={styles.muted}>
            Il prototipo del motore è pronto: due wrestler sul ring isometrico, un incontro che si
            anima da solo. Stesso seed, identico spettacolo.
          </p>
          <Link to="/match" className="btn btn-primary">
            Guarda il match dimostrativo
          </Link>
        </section>

        <section className={styles.card}>
          <h2>Salvataggio</h2>
          <dl className={styles.dl}>
            <dt>Seed</dt>
            <dd>{current.seed}</dd>
            <dt>Data di gioco</dt>
            <dd>{current.inGameDate}</dd>
            <dt>Ultimo salvataggio</dt>
            <dd>{formatDate(current.updatedAt)}</dd>
          </dl>
          <p className={styles.muted}>
            Ogni modifica viene salvata subito su questo dispositivo. Nessun account, nessun
            server.
          </p>
        </section>
      </div>
    </div>
  );
}
