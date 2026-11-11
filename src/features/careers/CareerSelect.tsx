import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import {
  DAY_LABELS,
  DEFAULT_COLORS,
  FEDERATION_PHILOSOPHIES,
  MAX_SHOWS,
  PHILOSOPHY_LABELS,
  SHOW_DAYS,
} from "../../game/core/federation";
import type { FederationPhilosophy, WeeklyShow } from "../../game/types/career";
import styles from "./CareerSelect.module.css";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
}

export default function CareerSelect() {
  const navigate = useNavigate();
  const create = useCareerStore((s) => s.create);

  const [federationName, setFederationName] = useState("");
  const [gmName, setGmName] = useState("");
  const [seed, setSeed] = useState("");
  const [showIdentity, setShowIdentity] = useState(false);
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [philosophy, setPhilosophy] = useState<FederationPhilosophy>("spettacolare");
  const [shows, setShows] = useState<WeeklyShow[]>([
    { id: "show-1", name: "Show settimanale", day: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);
    const res = await create({
      federationName,
      gmName,
      seed,
      identity: { colors, philosophy, shows, logo: null },
    });
    setCreating(false);
    if (res.career) {
      navigate(`/career/${res.career.saveId}`);
    } else {
      setFormError(res.error ?? "Controlla i dati inseriti");
    }
  }

  function updateShow(id: string, patch: Partial<WeeklyShow>) {
    setShows((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addShow() {
    setShows((prev) => {
      if (prev.length >= MAX_SHOWS) return prev;
      const usedDays = new Set(prev.map((s) => s.day));
      const freeDay = SHOW_DAYS.find((d) => !usedDays.has(d)) ?? 1;
      return [...prev, { id: `show-${crypto.randomUUID().slice(0, 8)}`, name: "", day: freeDay }];
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Little Elsewhere</p>
        <h1>Main Event</h1>
        <p className={styles.tagline}>
          Nome, GM, seed e identità: il resto del roster nasce dal seed. Ogni decisione lascia il
          segno.
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

          <button type="button" className="btn" onClick={() => setShowIdentity((v) => !v)}>
            {showIdentity ? "Nascondi identità" : "Personalizza identità (colori, filosofia, show)"}
          </button>

          {showIdentity && (
            <div className={styles.identity}>
              <div className={styles.colorRow}>
                {(["primary", "secondary", "accent"] as const).map((key) => (
                  <label key={key} className={styles.colorField}>
                    <span>
                      {key === "primary"
                        ? "Colore primario"
                        : key === "secondary"
                          ? "Colore secondario"
                          : "Colore accento"}
                    </span>
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <div className="field">
                <label htmlFor="philosophy">Filosofia di booking</label>
                <select
                  id="philosophy"
                  value={philosophy}
                  onChange={(e) => setPhilosophy(e.target.value as FederationPhilosophy)}
                >
                  {FEDERATION_PHILOSOPHIES.map((p) => (
                    <option key={p} value={p}>
                      {PHILOSOPHY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.showList}>
                {shows.map((s) => (
                  <div key={s.id} className={styles.showRow}>
                    <input
                      value={s.name}
                      onChange={(e) => updateShow(s.id, { name: e.target.value })}
                      placeholder="Nome dello show"
                      maxLength={30}
                      aria-label="Nome dello show"
                    />
                    <select
                      value={s.day}
                      onChange={(e) => updateShow(s.id, { day: Number(e.target.value) })}
                      aria-label="Giorno dello show"
                    >
                      {SHOW_DAYS.map((d) => (
                        <option key={d} value={d}>
                          {DAY_LABELS[d]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setShows((prev) => prev.filter((x) => x.id !== s.id))}
                      disabled={shows.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                onClick={addShow}
                disabled={shows.length >= MAX_SHOWS}
              >
                + Aggiungi show
              </button>
              <p className={styles.muted}>
                Il logo lo carichi dopo, dalla pagina Identità della federazione. Finché non c’è, lo
                stemma nasce dai colori e dalle iniziali.
              </p>
            </div>
          )}

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

      <footer className={styles.footer}>
        <Link to="/" className={styles.back}>
          ← Torna alla home
        </Link>
      </footer>
    </div>
  );
}

