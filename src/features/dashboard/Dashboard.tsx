import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import styles from "./Dashboard.module.css";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export default function Dashboard() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
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
          <h2>Prossimo passo</h2>
          <p className={styles.muted}>
            Le fondamenta ci sono: la tua federazione esiste, viene salvata e la ritrovi quando
            torni. Al prossimo checkpoint costruiamo il cuore dell&apos;app: il ring isometrico e
            il primo match animato.
          </p>
        </section>
      </div>
    </div>
  );
}
