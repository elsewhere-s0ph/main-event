import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCareerStore } from "../../career/store";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import pkg from "../../../package.json";

function formatDate(value: string | undefined): string {
  if (!value) return "";
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: it });
  } catch {
    return "";
  }
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
    const sorted = [...careers].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return sorted[0];
  }, [careers]);

  async function handleRemove(saveId: string, name: string) {
    await remove(saveId);
    setNotice(`${name} eliminata.`);
  }

  return (
    <div className="page">
      <div className="glow" aria-hidden="true" />

      <header className="hero">
        <div className="tron" aria-hidden="true">
          <div className="bulbs">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className={i % 2 === 0 ? "bulbGold" : "bulbLav"} />
            ))}
          </div>
          <p className="tronTitle">MAIN EVENT</p>
          <p className="tronSub">Wrestling Manager</p>
        </div>
        <p className="kicker">Little Elsewhere</p>
        <h1>La sera in cui tutto è in gioco.</h1>
        <p className="tagline">
          Fonda una federazione, booka le tue card e porta i tuoi wrestler fino al Main Event.
        </p>
      </header>

      <main className="actions">
        {latest ? (
          <button
            type="button"
            className="continue"
            onClick={() => navigate(`/career/${latest.saveId}`)}
          >
            <span className="continueKicker">Continua</span>
            <span className="continueName">{latest.name}</span>
            <span className="continueMeta">
              {formatDate(latest.updatedAt) || "Federazione salvata"} · tocca per riprendere
            </span>
          </button>
        ) : null}

        <div className="ctaRow">
          <button type="button" className="btn btn-primary" onClick={() => navigate("/nuova")}>
            Fonda una federazione
          </button>
          <button type="button" className="btn" onClick={() => navigate("/match")}>
            Match dimostrativo
          </button>
        </div>

        {careers.length > 0 || latest ? (
          <button type="button" className="linkBtn" onClick={() => setShowList(true)}>
            Le tue federazioni ({careers.length})
          </button>
        ) : null}

        {notice ? <p className="muted">{notice}</p> : null}
      </main>

      <footer className="footer">
        <p>Main Event v{pkg.version} · Little Elsewhere</p>
        <p>un app, non un gioco</p>
      </footer>

      {showList ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Le tue federazioni">
          <div className="panel">
            <div className="panelHead">
              <h2>Le tue federazioni</h2>
              <button type="button" className="btn" onClick={() => setShowList(false)}>
                Chiudi
              </button>
            </div>
            {loading ? (
              <p className="muted">Caricamento…</p>
            ) : careers.length === 0 ? (
              <p className="muted">Nessuna federazione ancora. Fondane una per iniziare.</p>
            ) : (
              <ul className="list">
                {careers.map((c) => (
                  <li key={c.saveId} className="row">
                    <div className="rowInfo">
                      <strong>{c.name}</strong>
                      <span>{formatDate(c.updatedAt) || "Federazione salvata"}</span>
                    </div>
                    <div className="rowActions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate(`/career/${c.saveId}`)}
                      >
                        Apri
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void handleRemove(c.saveId, c.name)}
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
      ) : null}
    </div>
  );
}
