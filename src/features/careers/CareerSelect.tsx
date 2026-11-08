import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import styles from "./CareerSelect.module.css";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export default function CareerSelect() {
  const navigate = useNavigate();
  const careers = useCareerStore((s) => s.careers);
  const loading = useCareerStore((s) => s.loading);
  const refresh = useCareerStore((s) => s.refresh);
  const create = useCareerStore((s) => s.create);
  const remove = useCareerStore((s) => s.remove);

  const [federationName, setFederationName] = useState("");
  const [gmName, setGmName] = useState("");
  const [seed, setSeed] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    const res = await create({ federationName, gmName, seed });
    setCreating(false);
    if (res.career) {
      navigate(`/career/${res.career.saveId}`);
    } else {
      setFormError(res.error ?? "Controlla i dati inseriti");
    }
  }

  function handleDelete(saveId: string) {
    if (window.confirm("Eliminare definitivamente questa federazione?")) {
      void remove(saveId);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Little Elsewhere</p>
        <h1>Main Event</h1>
        <p className={styles.tagline}>
          Fondi la tua federazione di wrestling, firma il roster, organizza gli show. Ogni decisione
          lascia il segno.
        </p>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>Nuova federazione</h2>
        <form onSubmit={handleCreate}>
          <div className={styles.formGrid}>
            <div className="field">
              <label htmlFor="federationName">Nome della federazione</label>
              <input
                id="federationName"
                value={federationName}
                onChange={(e) => setFederationName(e.target.value)}
                placeholder="Es. Frontier Wrestling Alliance"
                maxLength={40}
              />
            </div>
            <div className="field">
              <label htmlFor="gmName">Il tuo nome (General Manager)</label>
              <input
                id="gmName"
                value={gmName}
                onChange={(e) => setGmName(e.target.value)}
                placeholder="Es. Flynn"
                maxLength={40}
              />
            </div>
            <div className="field">
              <label htmlFor="seed">Seed (opzionale)</label>
              <input
                id="seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Lascia vuoto per un seed casuale"
                maxLength={64}
              />
            </div>
          </div>
          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Fondazione in corso…" : "Fonda la federazione"}
          </button>
        </form>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Le tue federazioni</h2>
        {loading && careers.length === 0 && <p className={styles.muted}>Caricamento…</p>}
        {!loading && careers.length === 0 && (
          <p className={styles.muted}>Nessuna federazione, per ora. La prima è a un passo.</p>
        )}
        <ul className={styles.cards}>
                                           {careers.map((c) => (
            <li key={c.saveId} className={styles.card}>
              <div>
                <h3 className={styles.cardTitle}>{c.federationName}</h3>
                <p className={styles.cardMeta}>
                  GM {c.gmName} · seed {c.seed}
                </p>
                <p className={styles.cardMeta}>Ultimo salvataggio: {formatDate(c.updatedAt)}</p>
              </div>
              <div className={styles.cardActions}>
                <button className="btn btn-primary" onClick={() => navigate(`/career/${c.saveId}`)}>
                  Apri
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(c.saveId)}>
                  Elimina
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <p className={styles.muted}>
          Checkpoint C1 — le fondamenta. Prossimo passo: il prototipo del motore di gioco.
        </p>
      </footer>
    </div>
  );
}
