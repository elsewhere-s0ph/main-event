import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useCareerStore } from "../../stores/careerStore";
import { useBookingStore } from "../../stores/bookingStore";
import {
  generateRivalFederations,
  shareOf,
  userViewers,
  weeklyStandings,
  USER_REPUTATION,
} from "../../game/core/world";
import { fmtEuro, showFinanceBreakdown } from "../../game/core/economy";
import { bestMatches, bestShows, longestReigns, mostDefenses } from "../../game/core/hallOfFame";
import styles from "./WorldPage.module.css";

// Mondo & ascolti (C5): le rivali si misurano negli ascolti, il bilancio
// racconta ogni euro e la Hall of Fame custodisce i record. La logica vive
// nei moduli puri: questa pagina racconta.

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}

function fmtViewers(n: number): string {
  return n.toLocaleString("it-IT");
}

export default function WorldPage() {
  const { saveId } = useParams();
  const current = useCareerStore((s) => s.current);
  const roster = useCareerStore((s) => s.roster);
  const titles = useCareerStore((s) => s.titles);
  const open = useCareerStore((s) => s.open);

  const results = useBookingStore((s) => s.results);
  const load = useBookingStore((s) => s.load);

  useEffect(() => {
    if (saveId) {
      void open(saveId).then((career) => {
        if (career) void load(career.saveId);
      });
    }
  }, [saveId, open, load]);

  const rivals = useMemo(
    () => generateRivalFederations(current?.seed ?? ""),
    [current?.seed]
  );

  const nameOf = useMemo(() => {
    const byId = new Map(roster.map((w) => [w.id, w.name] as const));
    return (id: string) => byId.get(id) ?? "sconosciuto";
  }, [roster]);

  const orderedResults = useMemo(
    () => [...results].sort((a, b) => a.date.localeCompare(b.date)),
    [results]
  );

  const latest = orderedResults.length > 0 ? orderedResults[orderedResults.length - 1] : null;

  const standings = useMemo(() => {
    if (!current || !latest) return null;
    return weeklyStandings(
      current.federationName,
      userViewers(latest.rating, latest.isSpecial, USER_REPUTATION),
      latest.rating,
      rivals,
      latest.date,
      current.seed
    );
  }, [current, latest, rivals]);

  const maxViewers = standings
    ? standings.reduce((m, s) => Math.max(m, s.viewers), 0)
    : 0;

  const lastBreakdown = useMemo(() => {
    if (!latest) return null;
    return showFinanceBreakdown({
      rating: latest.rating,
      isSpecial: latest.isSpecial,
      viewers: userViewers(latest.rating, latest.isSpecial, USER_REPUTATION),
      showName: latest.showName,
      date: latest.date,
      weeklyPayroll: roster.reduce((sum, w) => sum + w.contract.weeklyPay, 0),
    });
  }, [latest, roster]);

  const topMatches = useMemo(() => bestMatches(results, nameOf, 3), [results, nameOf]);
  const topShows = useMemo(() => bestShows(results, 3), [results]);
  const topReigns = useMemo(
    () => longestReigns(titles, current?.inGameDate ?? "2027-01-01", 3),
    [titles, current?.inGameDate]
  );
  const topDefenses = useMemo(() => mostDefenses(titles, 3), [titles]);

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

  const finance = current.finance ?? { balance: 0, transactions: [] };
  const userShare = standings ? shareOf(standings, "user") : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} to={`/career/${current.saveId}`}>
          ← {current.federationName}
        </Link>
        <h1>Mondo &amp; ascolti</h1>
        <p className={styles.muted}>
          Le altre federazioni non salgono sul tuo ring: si sfidano negli ascolti. Ogni show
          registrato è una settimana di battaglia per il pubblico, e ogni euro lascia una riga
          nel registro.
        </p>
      </header>

      <section className={styles.card}>
        <h2>Ascolti della settimana</h2>
        {!standings || !latest ? (
          <>
            <p className={styles.muted}>
              Nessuno show registrato: le rivali ti aspettano in cima alla classifica.
            </p>
            <ul className={styles.standings}>
              {rivals.map((r) => (
                <li key={r.id} className={styles.standingRow}>
                  <span className={styles.pos}>·</span>
                  <span className={styles.standingName}>
                    <span className={styles.dot} style={{ background: r.color }} />
                    {r.name}
                  </span>
                  <span className={styles.standingViewers}>
                    {fmtViewers(r.reputation * 130)} spettatori
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className={styles.muted}>
              {fmtDate(latest.date)} — {latest.showName} · valutazione {latest.rating}/100 · quota{" "}
              {userShare}%
            </p>
            <ul className={styles.standings}>
              {standings.map((s, i) => (
                <li
                  key={s.id}
                  className={`${styles.standingRow} ${s.isUser ? styles.userRow : ""}`}
                >
                  <span className={styles.pos}>{i + 1}°</span>
                  <span className={styles.standingMain}>
                    <span className={styles.standingName}>
                      <span className={styles.dot} style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className={styles.bar}>
                      <span
                        className={styles.barFill}
                        style={{
                          width: `${maxViewers > 0 ? (s.viewers / maxViewers) * 100 : 0}%`,
                          background: s.color,
                        }}
                      />
                    </span>
                  </span>
                  <span className={styles.standingViewers}>
                    {fmtViewers(s.viewers)}
                    <span className={styles.share}>{shareOf(standings, s.id)}%</span>
                  </span>
                </li>
              ))}
            </ul>
            {orderedResults.length > 1 && (
              <>
                <h3>Le tue ultime serate</h3>
                <ul className={styles.audienceHistory}>
                  {[...orderedResults]
                    .reverse()
                    .slice(0, 6)
                    .map((r) => (
                      <li key={r.id} className={styles.audienceRow}>
                        <span>
                          {fmtDate(r.date)} — {r.showName}
                        </span>
                        <span>
                          {fmtViewers(userViewers(r.rating, r.isSpecial, USER_REPUTATION))}{" "}
                          spettatori · {r.rating}/100
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2>Bilancio</h2>
        <p className={`${styles.balance} ${finance.balance < 0 ? styles.balanceNegative : ""}`}>
          {fmtEuro(finance.balance)}
        </p>
        {lastBreakdown && (
          <>
            <p className={styles.muted}>
              Il conto dell’ultima serata ({fmtDate(lastBreakdown.date)} — {lastBreakdown.showName}):
            </p>
            <ul className={styles.breakdown}>
              <li>
                <span className={styles.breakdownLabel}>Biglietti</span>
                <span className={styles.positive}>+{fmtEuro(lastBreakdown.tickets)}</span>
              </li>
              <li>
                <span className={styles.breakdownLabel}>Merchandising</span>
                <span className={styles.positive}>+{fmtEuro(lastBreakdown.merchandising)}</span>
              </li>
              <li>
                <span className={styles.breakdownLabel}>Sponsor</span>
                <span className={styles.positive}>+{fmtEuro(lastBreakdown.sponsor)}</span>
              </li>
              <li>
                <span className={styles.breakdownLabel}>Arena</span>
                <span className={styles.negative}>−{fmtEuro(lastBreakdown.arena)}</span>
              </li>
              <li>
                <span className={styles.breakdownLabel}>Stipendi (settimana)</span>
                <span className={styles.negative}>−{fmtEuro(lastBreakdown.payroll)}</span>
              </li>
              <li>
                <span className={styles.breakdownLabel}>Netto serata</span>
                <span className={lastBreakdown.net >= 0 ? styles.positive : styles.negative}>
                  {lastBreakdown.net >= 0 ? "+" : ""}
                  {fmtEuro(lastBreakdown.net)}
                </span>
              </li>
            </ul>
          </>
        )}
        {finance.transactions.length > 0 && (
          <>
            <h3>Registro</h3>
            <ul className={styles.txList}>
              {finance.transactions.slice(0, 8).map((t) => (
                <li key={t.id} className={styles.txRow}>
                  <span className={styles.txLabel}>
                    {t.label}
                    <span className={styles.txDate}>{fmtDate(t.date)}</span>
                  </span>
                  <span
                    className={`${styles.txAmount} ${t.amount >= 0 ? styles.positive : styles.negative}`}
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {fmtEuro(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2>Hall of Fame</h2>
        {results.length === 0 && titles.every((t) => t.reigns.length === 0) ? (
          <p className={styles.muted}>
            I record si scrivono registrando show: il primo match leggendario è ancora da
            inventare.
          </p>
        ) : (
          <div className={styles.hofGrid}>
            <div>
              <h3>Match leggendari</h3>
              {topMatches.length === 0 ? (
                <p className={styles.muted}>Ancora nessun match registrato.</p>
              ) : (
                <ul className={styles.hofList}>
                  {topMatches.map((m, i) => (
                    <li key={i}>
                      <span className={styles.hofHead}>
                        <span>
                          {m.a} vs {m.b}
                        </span>
                        <span className={styles.hofRating}>{m.rating}</span>
                      </span>
                      <span className={styles.hofMuted}>
                        {m.showName} · {fmtDate(m.date)} — {m.summary}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Show da ricordare</h3>
              {topShows.length === 0 ? (
                <p className={styles.muted}>Ancora nessuno show registrato.</p>
              ) : (
                <ul className={styles.hofList}>
                  {topShows.map((s, i) => (
                    <li key={i}>
                      <span className={styles.hofHead}>
                        <span>
                          {s.isSpecial ? "★ " : ""}
                          {s.showName}
                        </span>
                        <span className={styles.hofRating}>{s.rating}</span>
                      </span>
                      <span className={styles.hofMuted}>{fmtDate(s.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Regni più lunghi</h3>
              {topReigns.length === 0 ? (
                <p className={styles.muted}>Nessun regno nella storia della federazione.</p>
              ) : (
                <ul className={styles.hofList}>
                  {topReigns.map((r, i) => (
                    <li key={i}>
                      <span className={styles.hofHead}>
                        <span>{r.championName}</span>
                        <span className={styles.hofRating}>{r.days} gg</span>
                      </span>
                      <span className={styles.hofMuted}>
                        {r.titleName}
                        {r.ongoing && <span className={styles.ongoing}> · regna ancora</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Più difese riuscite</h3>
              {topDefenses.length === 0 ? (
                <p className={styles.muted}>
                  Nessuna difesa ancora: i titoli in palio contano dalla prima sera.
                </p>
              ) : (
                <ul className={styles.hofList}>
                  {topDefenses.map((r, i) => (
                    <li key={i}>
                      <span className={styles.hofHead}>
                        <span>{r.championName}</span>
                        <span className={styles.hofRating}>{r.defenses}</span>
                      </span>
                      <span className={styles.hofMuted}>{r.titleName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
