import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { isEligible, reignDays } from "../../game/core/titles";
import type { ChampionshipCategory } from "../../game/types/titles";
import styles from "./TitlesPage.module.css";

// Titoli e albi d'oro (C3): chi regna adesso, chi ha regnato prima.
// Incorporazione e vacanta passano dallo store (e dal repository):
// la storia della federazione non si scrive mai direttamente dalla UI.

const CATEGORY_LABEL: Record<ChampionshipCategory, string> = {
  world: "titolo principale",
  secondary: "titolo secondario",
  cruiserweight: "pesi leggeri",
};

const CATEGORIES: ChampionshipCategory[] = ["secondary", "cruiserweight", "world"];

function reignText(days: number): string {
  if (days < 14) return days === 1 ? "1 giorno" : `${days} giorni`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 settimana" : `${weeks} settimane`;
}

export default function TitlesPage() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const roster = useCareerStore((s) => s.roster);
  const titles = useCareerStore((s) => s.titles);
  const open = useCareerStore((s) => s.open);
  const addTitle = useCareerStore((s) => s.addTitle);
  const renameTitle = useCareerStore((s) => s.renameTitle);
  const crownWrestler = useCareerStore((s) => s.crownWrestler);
  const vacateTitle = useCareerStore((s) => s.vacateTitle);

  const [picks, setPicks] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ChampionshipCategory>("secondary");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saveId) void open(saveId);
  }, [saveId, open]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!saveId) return;
    setBusy(true);
    const res = await addTitle({ name: newName, category: newCategory });
    setBusy(false);
    if (res.title) {
      setNewName("");
      setFeedback({ ok: true, text: `${res.title.name} creato: è vacante, tocca incoronare.` });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleRename(e: FormEvent, titleId: string) {
    e.preventDefault();
    setBusy(true);
    const res = await renameTitle(titleId, editName);
    setBusy(false);
    if (res.title) {
      setEditing(null);
      setFeedback({ ok: true, text: "Titolo rinominato." });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleCrown(titleId: string) {
    const wrestlerId = picks[titleId];
    if (!wrestlerId) return;
    setBusy(true);
    const res = await crownWrestler(titleId, wrestlerId);
    setBusy(false);
    if (res.title) {
      setPicks({ ...picks, [titleId]: "" });
      setFeedback({ ok: true, text: `${res.title.name} ha un nuovo campione.` });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleVacate(titleId: string, titleName: string) {
    const conferma = window.confirm(
      `Rendere vacante ${titleName}? Il regno finisce oggi e resta nell'albo d'oro.`
    );
    if (!conferma) return;
    setBusy(true);
    const res = await vacateTitle(titleId);
    setBusy(false);
    if (res.title) {
      setFeedback({ ok: true, text: `${titleName} è ora vacante.` });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  if (!current) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Federazione non trovata o in caricamento.</p>
        <Link className={styles.back} to={saveId ? `/career/${saveId}` : "/"}>
          ← Torna alla federazione
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} to={`/career/${saveId}`}>
          ← {current.federationName}
        </Link>
        <h1>Titoli e albi d’oro</h1>
        <p className={styles.muted}>
          Chi regna adesso e chi ha regnato prima: qui si scrive la storia della federazione.
        </p>
      </header>

      {feedback && (
        <p className={feedback.ok ? styles.feedback : styles.error} role="status">
          {feedback.text}
        </p>
      )}

      <div className={styles.stack}>
        {titles.map((t) => {
          const champ = roster.find((w) => w.id === t.currentChampionId) ?? null;
          const openReign = champ ? t.reigns[t.reigns.length - 1] : null;
          const days = openReign ? reignDays(openReign, current.inGameDate) : 0;
          const eligible = roster.filter((w) => isEligible(t, w));
          return (
            <section key={t.id} className={styles.card}>
              <div className={styles.titleHead}>
                <h2>{t.name}</h2>
                <span className={styles.categoryTag}>{CATEGORY_LABEL[t.category]}</span>
                <span
                  className={styles.stars}
                  title={`Prestigio ${t.prestige} su 10`}
                  aria-label={`Prestigio ${t.prestige} su 10`}
                >
                  {"★".repeat(t.prestige)}
                </span>
              </div>

              {editing === t.id ? (
                <form className={styles.renameRow} onSubmit={(e) => handleRename(e, t.id)}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={40}
                    aria-label="Nome del titolo"
                  />
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    Salva
                  </button>
                  <button type="button" className={styles.smallBtn} onClick={() => setEditing(null)}>
                    Annulla
                  </button>
                </form>
              ) : (
                <div className={styles.renameRow}>
                  <button type="button" className={styles.smallBtn} onClick={() => { setEditing(t.id); setEditName(t.name); }}>
                    Rinomina
                  </button>
                </div>
              )}

              <div className={styles.champRow}>
                {champ && openReign ? (
                  <>
                    <span className={styles.champLabel}>Campione:</span>
                    <Link
                      className={styles.champLink}
                      to={`/career/${saveId}/wrestler/${champ.id}`}
                    >
                      {champ.name}
                    </Link>
                    <span className={styles.muted}>
                      regna da {reignText(days)} (dal {openReign.wonOn})
                    </span>
                    <button
                      type="button"
                      className={styles.smallBtn}
                      onClick={() => handleVacate(t.id, t.name)}
                      disabled={busy}
                    >
                      Rendi vacante
                    </button>
                  </>
                ) : (
                  <span className={styles.vacant}>Titolo vacante</span>
                )}
              </div>

              <div className={styles.crownRow}>
                <select
                  value={picks[t.id] ?? ""}
                  onChange={(e) => setPicks({ ...picks, [t.id]: e.target.value })}
                  aria-label={`Nuovo campione per ${t.name}`}
                >
                  <option value="">Scegli il nuovo campione…</option>
                  {eligible.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!picks[t.id] || busy}
                  onClick={() => handleCrown(t.id)}
                >
                  Incorona
                </button>
              </div>

              {t.reigns.length > 0 && (
                <div className={styles.albo}>
                  <h3>Albo d’oro</h3>
                  <ol className={styles.reignList}>
                    {[...t.reigns].reverse().map((r, i) => (
                      <li key={`${r.championId}-${r.wonOn}-${i}`} className={styles.reignRow}>
                        <strong>{r.championName}</strong>
                        <span className={styles.muted}>
                          {r.wonOn} → {r.lostOn ?? "in corso"} ·{" "}
                          {reignText(reignDays(r, current.inGameDate))}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          );
        })}

        <section className={styles.card}>
          <h2>Nuovo titolo</h2>
          <form onSubmit={handleCreate} className={styles.stack}>
            <div className="field">
              <label htmlFor="titleName">Nome del titolo</label>
              <input
                id="titleName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={40}
                placeholder="Es. Campionato Internazionale"
              />
            </div>
            <div className={styles.fieldText}>
              <span className={styles.labelText}>Categoria</span>
              <div className={styles.segmented} role="group" aria-label="Categoria del titolo">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={newCategory === cat ? styles.active : undefined}
                    onClick={() => setNewCategory(cat)}
                  >
                    {CATEGORY_LABEL[cat]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button type="submit" className="btn btn-primary" disabled={busy || newName.trim().length < 2}>
                Crea il titolo
              </button>
            </div>
            <p className={styles.muted}>
              I titoli di categoria sono riservati: il titolo dei pesi leggeri lo può vincere
              solo chi gareggia in quella divisione.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
