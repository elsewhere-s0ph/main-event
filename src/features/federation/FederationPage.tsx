import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
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
import { fileToLogoDataUrl } from "./logo";
import Crest from "./Crest";
import styles from "./FederationPage.module.css";

export default function FederationPage() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const open = useCareerStore((s) => s.open);
  const rename = useCareerStore((s) => s.rename);
  const updateIdentity = useCareerStore((s) => s.updateIdentity);

  const [name, setName] = useState("");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [philosophy, setPhilosophy] = useState<FederationPhilosophy>("spettacolare");
  const [shows, setShows] = useState<WeeklyShow[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saveId) void open(saveId);
  }, [saveId, open]);

  useEffect(() => {
    if (!current) return;
    setName(current.federationName);
    setColors(current.colors ?? DEFAULT_COLORS);
    setPhilosophy(current.philosophy ?? "spettacolare");
    setShows(current.shows ?? []);
    setLogo(current.logo ?? null);
  }, [current]);

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link to="/">← Tutte le federazioni</Link>
      </div>
    );
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

  function removeShow(id: string) {
    setShows((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }

  async function handleLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setLogo(dataUrl);
      setFeedback(null);
    } catch {
      setFeedback("Non riesco a leggere questa immagine: prova con un PNG o un JPG.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!saveId) return;
    setSaving(true);
    setFeedback(null);
    let error: string | null = null;
    if (name !== current.federationName) {
      const renamed = await rename(saveId, name);
      if (renamed.error) error = renamed.error;
    }
    if (!error) {
      const res = await updateIdentity({ colors, philosophy, shows, logo });
      error = res.error;
    }
    setSaving(false);
    setFeedback(error ?? "Identità salvata.");
  }

  return (
    <div className={styles.page}>
      <Link to={`/career/${saveId}`} className={styles.back}>
        ← Dashboard
      </Link>
      <header className={styles.header}>
        <Crest name={name || current.federationName} colors={colors} logo={logo} size={72} />
        <div>
          <h1>Identità della federazione</h1>
          <p className={styles.muted}>
            Nome, colori, filosofia e show settimanali: come si presenta la tua federazione al
            mondo.
          </p>
        </div>
      </header>

      <form onSubmit={handleSave} className={styles.form}>
        <section className={styles.card}>
          <h2>Nome</h2>
          <div className="field">
            <label htmlFor="federationName">Nome della federazione</label>
            <input
              id="federationName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
        </section>

        <section className={styles.card}>
          <h2>Colori</h2>
          <div className={styles.colorRow}>
            {(["primary", "secondary", "accent"] as const).map((key) => (
              <label key={key} className={styles.colorField}>
                <span>
                  {key === "primary" ? "Primario" : key === "secondary" ? "Secondario" : "Accento"}
                </span>
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className={styles.muted}>
            Senza logo caricato, lo stemma usa questi colori con le iniziali del nome.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Filosofia di booking</h2>
          <div className={styles.pillRow}>
            {FEDERATION_PHILOSOPHIES.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.pill} ${philosophy === p ? styles.pillActive : ""}`}
                onClick={() => setPhilosophy(p)}
              >
                {PHILOSOPHY_LABELS[p]}
              </button>
            ))}
          </div>
          <p className={styles.muted}>
            Per ora è la firma della tua federazione: dal booking in poi influenzerà il pubblico e
            le scelte delle federazioni rivali.
          </p>
        </section>

        <section className={styles.card}>
          <h2>
            Show settimanali ({shows.length}/{MAX_SHOWS})
          </h2>
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
                  onClick={() => removeShow(s.id)}
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
        </section>

        <section className={styles.card}>
          <h2>Logo</h2>
          <div className={styles.logoRow}>
            <Crest name={name || current.federationName} colors={colors} logo={logo} size={64} />
            <div className={styles.logoActions}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleLogo}
                aria-label="Carica un logo"
              />
              {logo && (
                <button type="button" className="btn btn-danger" onClick={() => setLogo(null)}>
                  Usa lo stemma generato
                </button>
              )}
            </div>
          </div>
          <p className={styles.muted}>
            L’immagine viene adattata a un quadrato e salvata solo su questo dispositivo: nessun
            upload su server.
          </p>
        </section>

        {feedback && (
          <p className={styles.feedback} role="status">
            {feedback}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvataggio…" : "Salva identità"}
        </button>
      </form>
    </div>
  );
}
