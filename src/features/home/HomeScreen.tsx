import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import styles from "./HomeScreen.module.css";
import pkg from "../../../package.json";

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
  const [showList, setShowList] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latest = useMemo(() => {
    const sorted = [...careers].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return sorted[0] ?? null;
  }, [careers]);

  function handleDelete(saveId: string, name: string) {
    if (window.confirm(`Eliminare definitivamente ${name}?`)) {
      void remove(saveId);
      setNotice(`${name} eliminata.`);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.hero}>
        <div className={styles.tron} aria-hidden="true">
          <div className={styles.bulbs}>
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={i % 2 === 0 ? styles.bulbGold : styles.bulbLav} />
            ))}
          </div>
          <p className={styles.tronTitle}>MAIN EVENT</p>
          <p className={styles.tronSub}>Wrestling Manager</p>
        </div>
        <p className={styles.kicker}>Little Elsewhere</p>
        <h1>La sera in cui tutto è in gioco.</h1>
        <p className={styles.tagline}>
          Fonda la tua federazione, booka le card e porta i tuoi wrestler fino al Main Event. Ogni
          decisione lascia il segno.
        </p>
      </header>

      <main className={styles.actions}>
        {latest && (
          <button
            type="button"
            className={styles.continue}
            onClick={() => navigate(`/career/${latest.saveId}`)}
          >
            <span className={styles.continueKicker}>Continua</span>
            <span className={styles.continueName}>{latest.federationName}</span>
            <span className={styles.continueMeta}>
              GM {latest.gmName} · ultimo salvataggio: {formatDate(latest.updatedAt)}
            </span>
          </button>
        )}

        <div className={styles.ctaRow}>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/nuova")}>
            Fonda una federazione
          </button>
          <button type="button" className="btn" onClick={() => navigate("/match")}>
            Match dimostrativo
          </button>
        </div>

        {careers.length > 0 && (
          <button type="button" className={styles.linkBtn} onClick={() => setShowList(true)}>
            Le tue federazioni ({careers.length})
          </button>
        )}

        {notice ? <p className={styles.muted}>{notice}</p> : null}
      </main>

      <footer className={styles.footer}>
        <p>Main Event v{pkg.version} · Little Elsewhere</p>
        <p className={styles.muted}>un app, non un gioco</p>
      </footer>

      {showList && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Le tue federazioni">
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <h2>Le tue federazioni</h2>
              <button type="button" className="btn" onClick={() => setShowList(false)}>
                Chiudi
              </button>
            </div>
            {loading && careers.length === 0 ? (
              <p className={styles.muted}>Caricamento…</p>
            ) : (
              <ul className={styles.list}>
                {careers.map((c) => (
                  <li key={c.saveId} className={styles.row}>
                    <div className={styles.rowInfo}>
                      <strong>{c.federationName}</strong>
                      <span>
                        GM {c.gmName} · {formatDate(c.updatedAt)}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate(`/career/${c.saveId}`)}
                      >
                        Apri
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDelete(c.saveId, c.federationName)}
                      >
                        Elimina
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
