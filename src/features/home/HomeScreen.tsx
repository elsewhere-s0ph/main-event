import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import styles from "./HomeScreen.module.css";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const careers = useCareerStore((s) => s.careers);
  const loading = useCareerStore((s) => s.loading);
  const refresh = useCareerStore((s) => s.refresh);
  const remove = useCareerStore((s) => s.remove);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latest = [...careers].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null;

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
        <div className={styles.ctaRow}>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/nuova")}>
            Fonda una nuova federazione
          </button>
          <button type="button" className="btn" onClick={() => navigate("/match")}>
            Match dimostrativo
          </button>
        </div>
      </header>

      {latest && (
        <section className={styles.continue}>
          <p className={styles.continueTitle}>Riprendi da dove eri</p>
          <h2 className={styles.continueName}>{latest.federationName}</h2>
          <p className={styles.continueMeta}>
            GM {latest.gmName} · ultimo salvataggio: {formatDate(latest.updatedAt)}
          </p>
          <div className={styles.ctaRow}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/career/${latest.saveId}`)}
            >
              Entra nella federazione
            </button>
          </div>
        </section>
      )}

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
        <p className={styles.muted}>Main Event — un app, non un gioco. Little Elsewhere.</p>
      </footer>
    </div>
  );
}
