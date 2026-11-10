import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { contractStatus, RENEWAL_WEEKS, weeksRemaining, type ContractStatus } from "../../game/core/contracts";
import type { Wrestler } from "../../game/types/roster";
import styles from "./WrestlerPage.module.css";

// Scheda wrestler (C3): identità, attributi, mosse, look e contratto.
// Ogni modifica passa dalla validazione (saveWrestler / renewWrestler)
// prima di toccare il database: la UI non salva mai dati non validati.

type StatKey = "power" | "agility" | "stamina" | "charisma";

const STAT_LABELS: Record<StatKey, string> = {
  power: "Forza",
  agility: "Agilità",
  stamina: "Resistenza",
  charisma: "Carisma",
};

const STAT_ORDER: StatKey[] = ["power", "agility", "stamina", "charisma"];

const STATUS_LABEL: Record<ContractStatus, string> = {
  attivo: "attivo",
  "in scadenza": "in scadenza",
  scaduto: "scaduto",
};

interface FormState {
  name: string;
  nickname: string;
  gimmick: string;
  bodyType: string;
  alignment: string;
  stats: Record<StatKey, number>;
  signature: string;
  finisher: string;
  colors: { trim: string; skin: string };
}

function fromWrestler(w: Wrestler): FormState {
  return {
    name: w.name,
    nickname: w.nickname,
    gimmick: w.gimmick,
    bodyType: w.bodyType,
    alignment: w.alignment,
    stats: {
      power: w.stats.power,
      agility: w.stats.agility,
      stamina: w.stats.stamina,
      charisma: w.stats.charisma,
    },
    signature: w.signature,
    finisher: w.finisher,
    colors: { trim: w.colors.trim, skin: w.colors.skin },
  };
}

function clampStat(v: number): number {
  return Math.min(10, Math.max(1, v));
}

function withStat(
  stats: Record<StatKey, number>,
  key: StatKey,
  value: number
): Record<StatKey, number> {
  return {
    power: key === "power" ? value : stats.power,
    agility: key === "agility" ? value : stats.agility,
    stamina: key === "stamina" ? value : stats.stamina,
    charisma: key === "charisma" ? value : stats.charisma,
  };
}

export default function WrestlerPage() {
  const { saveId, wrestlerId } = useParams();
  const navigate = useNavigate();
  const current = useCareerStore((s) => s.current);
  const selected = useCareerStore((s) => s.selected);
  const open = useCareerStore((s) => s.open);
  const selectWrestler = useCareerStore((s) => s.selectWrestler);
  const saveWrestler = useCareerStore((s) => s.saveWrestler);
  const renewWrestler = useCareerStore((s) => s.renewWrestler);
  const releaseWrestler = useCareerStore((s) => s.releaseWrestler);

  const [form, setForm] = useState<FormState | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    if (!saveId) return;
    let cancelled = false;
    void (async () => {
      await open(saveId);
      if (!cancelled && wrestlerId) selectWrestler(wrestlerId);
    })();
    return () => {
      cancelled = true;
    };
  }, [saveId, wrestlerId, open, selectWrestler]);

  useEffect(() => {
    if (selected) setForm(fromWrestler(selected));
  }, [selected]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!wrestlerId || !form) return;
    setSaving(true);
    const res = await saveWrestler(wrestlerId, form);
    setSaving(false);
    if (res.wrestler) {
      setFeedback({ ok: true, text: "Scheda salvata." });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleRenew(weeks: number) {
    if (!wrestlerId) return;
    setRenewing(true);
    const res = await renewWrestler(wrestlerId, weeks);
    setRenewing(false);
    if (res.wrestler) {
      setFeedback({
        ok: true,
        text: `Contratto rinnovato fino al ${res.wrestler.contract.expiresOn} (${res.wrestler.contract.weeklyPay} a settimana).`,
      });
    } else {
      setFeedback({ ok: false, text: res.error ?? "Errore" });
    }
  }

  async function handleRelease() {
    if (!wrestlerId || !form || !saveId) return;
    const conferma = window.confirm(
      `Lasciare andare ${form.name}? Esce dal roster in modo definitivo.`
    );
    if (!conferma) return;
    setReleasing(true);
    await releaseWrestler(wrestlerId);
    setReleasing(false);
    navigate(`/career/${saveId}`);
  }

  if (!current || !selected || !form) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Wrestler non trovato o in caricamento.</p>
        <Link className={styles.back} to={saveId ? `/career/${saveId}` : "/"}>
          ← Torna alla federazione
        </Link>
      </div>
    );
  }

  const status = contractStatus(selected.contract, current.inGameDate);
  const weeks = weeksRemaining(selected.contract, current.inGameDate);
  const badgeClass =
    status === "scaduto" ? styles.badgeDanger : status === "in scadenza" ? styles.badgeWarn : styles.badgeOk;
  const scadenzaText =
    status === "scaduto"
      ? "Contratto scaduto: rinnova o lascia andare l'atleta."
      : weeks <= 1
        ? `Scade entro pochi giorni (il ${selected.contract.expiresOn}).`
        : `Scade tra ${weeks} settimane (il ${selected.contract.expiresOn}).`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} to={`/career/${saveId}`}>
          ← {current.federationName}
        </Link>
        <h1>{form.name}</h1>
        <p className={styles.muted}>{form.nickname}</p>
      </header>

      <form onSubmit={handleSave}>
        <div className={styles.stack}>
          <section className={styles.card}>
            <h2>Identità</h2>
            <div className={styles.stack}>
              <div className="field">
                <label htmlFor="wname">Nome</label>
                <input
                  id="wname"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={40}
                />
              </div>
              <div className="field">
                <label htmlFor="wnickname">Soprannome</label>
                <input
                  id="wnickname"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className={styles.fieldText}>
                <label htmlFor="wgimmick">Gimmick</label>
                <textarea
                  id="wgimmick"
                  value={form.gimmick}
                  onChange={(e) => setForm({ ...form, gimmick: e.target.value })}
                  maxLength={160}
                  rows={2}
                />
              </div>
              <div className={styles.fieldText}>
                <span className={styles.labelText}>Fazione</span>
                <div className={styles.segmented} role="group" aria-label="Fazione">
                  <button
                    type="button"
                    className={form.alignment === "face" ? styles.active : undefined}
                    onClick={() => setForm({ ...form, alignment: "face" })}
                  >
                    Beniamino
                  </button>
                  <button
                    type="button"
                    className={form.alignment === "heel" ? styles.active : undefined}
                    onClick={() => setForm({ ...form, alignment: "heel" })}
                  >
                    Cattivo
                  </button>
                </div>
              </div>
              <div className={styles.fieldText}>
                <span className={styles.labelText}>Categoria</span>
                <div className={styles.segmented} role="group" aria-label="Categoria">
                  <button
                    type="button"
                    className={form.bodyType === "heavyweight" ? styles.active : undefined}
                    onClick={() => setForm({ ...form, bodyType: "heavyweight" })}
                  >
                    Pesi massimi
                  </button>
                  <button
                    type="button"
                    className={form.bodyType === "cruiserweight" ? styles.active : undefined}
                    onClick={() => setForm({ ...form, bodyType: "cruiserweight" })}
                  >
                    Pesi leggeri
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Attributi</h2>
            <div className={styles.stack}>
              {STAT_ORDER.map((key) => (
                <div key={key} className={styles.statRow}>
                  <span className={styles.statLabel}>{STAT_LABELS[key]}</span>
                  <span className={styles.statBar} aria-hidden="true">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className={i < form.stats[key] ? styles.on : undefined} />
                    ))}
                  </span>
                  <span className={styles.statValue}>{form.stats[key]}</span>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() =>
                      setForm({
                        ...form,
                        stats: withStat(form.stats, key, clampStat(form.stats[key] - 1)),
                      })
                    }
                    disabled={form.stats[key] <= 1}
                    aria-label={`Riduci ${STAT_LABELS[key]}`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() =>
                      setForm({
                        ...form,
                        stats: withStat(form.stats, key, clampStat(form.stats[key] + 1)),
                      })
                    }
                    disabled={form.stats[key] >= 10}
                    aria-label={`Aumenta ${STAT_LABELS[key]}`}
                  >
                    +
                  </button>
                </div>
              ))}
              <p className={styles.muted}>
                Gli attributi vanno da 1 a 10 e guidano il motore degli incontri.
              </p>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Mosse</h2>
            <div className={styles.row2}>
              <div className="field">
                <label htmlFor="wsignature">Mossa firma</label>
                <input
                  id="wsignature"
                  value={form.signature}
                  onChange={(e) => setForm({ ...form, signature: e.target.value })}
                  maxLength={60}
                />
              </div>
              <div className="field">
                <label htmlFor="wfinisher">Finisher</label>
                <input
                  id="wfinisher"
                  value={form.finisher}
                  onChange={(e) => setForm({ ...form, finisher: e.target.value })}
                  maxLength={60}
                />
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2>Look</h2>
            <div className={styles.row2}>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  id="wtrim"
                  value={form.colors.trim}
                  onChange={(e) =>
                    setForm({ ...form, colors: { ...form.colors, trim: e.target.value } })
                  }
                />
                <label htmlFor="wtrim">Colore costume</label>
              </div>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  id="wskin"
                  value={form.colors.skin}
                  onChange={(e) =>
                    setForm({ ...form, colors: { ...form.colors, skin: e.target.value } })
                  }
                />
                <label htmlFor="wskin">Tono della pelle</label>
              </div>
            </div>
            <p className={styles.muted}>I colori comporranno lo sprite del wrestler nel ring.</p>
          </section>

          <section className={styles.card}>
            <h2>Contratto</h2>
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${badgeClass}`}>{STATUS_LABEL[status]}</span>
              <span className={styles.muted}>{scadenzaText}</span>
            </div>
            <dl className={styles.dl}>
              <dt>Paga settimanale</dt>
              <dd>{selected.contract.weeklyPay} a settimana</dd>
              <dt>Firmato il</dt>
              <dd>{selected.contract.signedOn}</dd>
              <dt>Scade il</dt>
              <dd>{selected.contract.expiresOn}</dd>
            </dl>
            <div className={styles.renewRow}>
              <span className={styles.labelText}>Rinnova per</span>
              {RENEWAL_WEEKS.map((wks) => (
                <button
                  key={wks}
                  type="button"
                  className={styles.renewBtn}
                  onClick={() => handleRenew(wks)}
                  disabled={renewing}
                >
                  {wks} sett.
                </button>
              ))}
            </div>
            <div className={styles.releaseRow}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleRelease}
                disabled={releasing}
              >
                {releasing ? "Trasferimento…" : "Lascia andare"}
              </button>
            </div>
            <p className={styles.muted}>
              Al rinnovo la paga si ricalcola dagli attributi attuali: migliorare un atleta
              costa.
            </p>
          </section>

          <div className={styles.saveRow}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Salvataggio…" : "Salva scheda"}
            </button>
            {feedback && (
              <p className={feedback.ok ? styles.feedback : styles.error} role="status">
                {feedback.text}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
