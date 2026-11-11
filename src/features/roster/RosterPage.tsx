import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { contractStatus } from "../../game/core/contracts";
import styles from "./RosterPage.module.css";

function bodyTypeLabel(bodyType: string): string {
  return bodyType === "heavyweight" ? "pesi massimi" : "pesi leggeri";
}

function alignmentLabel(alignment: string): string {
  return alignment === "face" ? "beniamino" : "cattivo";
}

export default function RosterPage() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const roster = useCareerStore((s) => s.roster);

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link to="/">← Torna alla home</Link>
      </div>
    );
  }

  const payroll = roster.reduce((sum, w) => sum + w.contract.weeklyPay, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Roster</h1>
        <p className={styles.muted}>
          {roster.length} atleti sotto contratto. Tocca un atleta per aprire la sua scheda.
        </p>
      </header>

      <section className={styles.card}>
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
          {roster.length === 0 && <li className={styles.muted}>Nessun atleta in rosa, per ora.</li>}
        </ul>
        <p className={styles.payroll}>
          Massa salariale: {payroll.toLocaleString("it-IT")} a settimana.
        </p>
        <p className={styles.muted}>
          Il roster nasce dal seed della federazione: stesso seed, stessi atleti.
        </p>
      </section>
    </div>
  );
}
