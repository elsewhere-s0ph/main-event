import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { contractStatus } from "../../game/core/contracts";
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
  const rename = useCareerStore((s) => s.rename);

  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (saveId) void open(saveId);
  }, [saveId, open]);

  useEffect(() => {
    if (current) setName(current.federationName);
  }, [current]);

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!saveId) return;
    setRenaming(true);
    const res = await rename(saveId, name);
    setRenaming(false);
    setFeedback(res.error ?? "Federazione rinominata e salvata.");
  }

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link to="/">← Tutte le federazioni</Link>
      </div>
    );
  }

  const payroll = roster.reduce((sum, w) => sum + w.contract.weeklyPay, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          ← Federazioni
        </Link>
        <h1>{current.federationName}</h1>
        <p className={styles.muted}>Benvenuto in federazione, GM {current.gmName}.</p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Identità</h2>
          <form onSubmit={handleRename}>
            <div className="field">
              <label htmlFor="federationName">Nome della federazione</label>
              <input
                id="federationName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={renaming}>
              {renaming ? "Salvataggio…" : "Salva"}
            </button>
            {feedback && (
              <p className={styles.feedback} role="status">
                {feedback}
              </p>
            )}
          </form>
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
