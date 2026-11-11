import { useEffect } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { DEFAULT_COLORS } from "../../game/core/federation";
import Crest from "../federation/Crest";
import styles from "./CareerLayout.module.css";

const TABS: { to: string; label: string }[] = [
  { to: "", label: "Panoramica" },
  { to: "roster", label: "Roster" },
  { to: "booking", label: "Booking" },
  { to: "titles", label: "Titoli" },
  { to: "world", label: "Mondo" },
  { to: "federation", label: "Federazione" },
];

export default function CareerLayout() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
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

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link to="/" className={styles.home} aria-label="Torna alla home">
          ←
        </Link>
        <Crest
          name={current.federationName}
          colors={current.colors ?? DEFAULT_COLORS}
          logo={current.logo ?? null}
          size={32}
        />
        <div className={styles.titles}>
          <strong>{current.federationName}</strong>
          <span>GM {current.gmName}</span>
        </div>
      </header>
      <nav className={styles.nav} aria-label="Sezioni della federazione">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to ? `/career/${saveId}/${t.to}` : `/career/${saveId}`}
            end={t.to === ""}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
