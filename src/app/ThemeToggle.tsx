import { useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("main-event-theme", next);
    } catch {
      // storage non disponibile (es. navigazione privata): il tema resta solo per la sessione
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passa al tema giorno" : "Passa al tema notte"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
