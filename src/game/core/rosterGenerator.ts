import { mulberry32, seedFromString } from "./rng";
import type { Alignment, Wrestler, WrestlerStats } from "../types/roster";
import type { BodyType } from "../types/match";

// Generatore del roster iniziale: deterministico dal seed della carriera
// (Documento Master §4: stesso seed → stesso mondo). Le identità sono
// "blueprint" curati a mano; il seed decide chi firma per la federazione,
// gli attributi e i termini del contratto. I nomi sono originali e
// modificabili in gioco dal GM (decisioni di gusto: Documento Master §11).

export interface WrestlerBlueprint {
  name: string;
  nickname: string;
  gimmick: string;
  bodyType: BodyType;
  signature: string;
  finisher: string;
  trim: string;
  skin: string;
}

export const DEFAULT_ROSTER_SIZE = 8;

const CONTRACT_WEEKS = [26, 39, 52] as const;

export const ROSTER_BLUEPRINTS: readonly WrestlerBlueprint[] = [
  {
    name: "Il Monolite",
    nickname: "La parete che cammina",
    gimmick: "Non parla mai: parlano i pugni.",
    bodyType: "heavyweight",
    signature: "Pressa del Colosso",
    finisher: "Frana Mortale",
    trim: "#2dd4bf",
    skin: "#d9b08c",
  },
  {
    name: "Caminetto",
    nickname: "Il forzuto di piazza",
    gimmick: "Solleva bilieri da quando aveva dodici anni.",
    bodyType: "heavyweight",
    signature: "Giro di Spalla",
    finisher: "Fiammata",
    trim: "#f97316",
    skin: "#e8c39e",
  },
  {
    name: "Toro Seduto",
    nickname: "La carica che non si ferma",
    gimmick: "Ex seconda linea di rugby, ora seconda riga del ring.",
    bodyType: "heavyweight",
    signature: "Placcaggio Alto",
    finisher: "Carica Infuriata",
    trim: "#dc2626",
    skin: "#8d5524",
  },
  {
    name: "Il Direttore",
    nickname: "Il capo che non si licenzia da solo",
    gimmick: "Scende in ring in giacca e cravatta e licenzia gli avversari.",
    bodyType: "heavyweight",
    signature: "Multa Salata",
    finisher: "Licenziamento in Tronco",
    trim: "#334155",
    skin: "#d9b08c",
  },
  {
    name: "Badile",
    nickname: "Il seppellitore di carriere",
    gimmick: "Promette a tutti la buca finale.",
    bodyType: "heavyweight",
    signature: "Palata Doppia",
    finisher: "Ottava Palata",
    trim: "#a3a3a3",
    skin: "#e8c39e",
  },
  {
    name: "Il Barone",
    nickname: "L'aristocratico del quadrato",
    gimmick: "Combatte in smoking e considera l'avversario un sottoposto.",
    bodyType: "heavyweight",
    signature: "Frustata di Guanto",
    finisher: "Ultima Volontà",
    trim: "#7c3aed",
    skin: "#fadcc2",
  },
  {
    name: "Dottor Sonno",
    nickname: "Il papavero del ring",
    gimmick: "Ti addormenta prima che tu te ne accorga.",
    bodyType: "heavyweight",
    signature: "Consulto a Domicilio",
    finisher: "Anestesia Totale",
    trim: "#0ea5e9",
    skin: "#d9b08c",
  },
  {
    name: "Quercia",
    nickname: "La vecchia guardia",
    gimmick: "Sessant'anni di palestra e radici profonde.",
    bodyType: "heavyweight",
    signature: "Rovescio della Foresta",
    finisher: "Marcia del Tronco",
    trim: "#4d7c0f",
    skin: "#c68642",
  },
  {
    name: "Vespa",
    nickname: "Il fulmine dei quartieri",
    gimmick: "Veloce, fastidioso, inossidabile.",
    bodyType: "cruiserweight",
    signature: "Girata di Fianco",
    finisher: "Pungiglione",
    trim: "#ef6b6b",
    skin: "#e8c39e",
  },
  {
    name: "Sveglia",
    nickname: "Il ritardatario urlato",
    gimmick: "Suona sempre un minuto prima dell'ingresso.",
    bodyType: "cruiserweight",
    signature: "Roba da Cinque Minuti",
    finisher: "Ora Legale",
    trim: "#f59e0b",
    skin: "#d9b08c",
  },
  {
    name: "Fulmine Bis",
    nickname: "Due tempi, una scarica",
    gimmick: "Colpisce sempre due volte, per scaramanzia.",
    bodyType: "cruiserweight",
    signature: "Doppia Scintilla",
    finisher: "Sopraccarico",
    trim: "#facc15",
    skin: "#8d5524",
  },
  {
    name: "Ombra Lunga",
    nickname: "Il figurante che non c'è",
    gimmick: "Entra a luci spente, esce con la vittoria.",
    bodyType: "cruiserweight",
    signature: "Passo Felpato",
    finisher: "Ultima Luce",
    trim: "#111827",
    skin: "#c68642",
  },
  {
    name: "Rete Marino",
    nickname: "Il pescatore di supplex",
    gimmick: "Porta a riva ogni avversario.",
    bodyType: "cruiserweight",
    signature: "Tiro della Lenza",
    finisher: "Onda di Rientro",
    trim: "#06b6d4",
    skin: "#e8c39e",
  },
  {
    name: "Baffo",
    nickname: "Il campione dei nonni",
    gimmick: "Baffi tirati a cera e prese di altri tempi.",
    bodyType: "cruiserweight",
    signature: "Presina d'Altri Tempi",
    finisher: "Cera Netta",
    trim: "#92400e",
    skin: "#fadcc2",
  },
  {
    name: "Laser",
    nickname: "Il taglio che non vedi",
    gimmick: "Dice di mirare col riflesso delle luci del ring.",
    bodyType: "cruiserweight",
    signature: "Fascio Basso",
    finisher: "Fascio Alto",
    trim: "#e11d48",
    skin: "#d9b08c",
  },
  {
    name: "Zampillo",
    nickname: "L'idrante a due gambe",
    gimmick: "Schizza ovunque e asciuga le vittorie.",
    bodyType: "cruiserweight",
    signature: "Idrante Aperto",
    finisher: "Onda Urtante",
    trim: "#22d3ee",
    skin: "#c68642",
  },
];

function pickIn(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Fisher–Yates deterministico. */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Somma settimane a una data di gioco (ISO, parte data). */
export function addWeeks(isoDate: string, weeks: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function statsFor(bodyType: BodyType, rng: () => number): WrestlerStats {
  const charisma = pickIn(rng, 3, 9);
  if (bodyType === "heavyweight") {
    return {
      power: pickIn(rng, 7, 10),
      agility: pickIn(rng, 2, 5),
      stamina: pickIn(rng, 5, 8),
      charisma,
    };
  }
  return {
    power: pickIn(rng, 3, 6),
    agility: pickIn(rng, 7, 10),
    stamina: pickIn(rng, 5, 8),
    charisma,
  };
}

function weeklyPayFor(stats: WrestlerStats): number {
  const avg = (stats.power + stats.agility + stats.stamina + stats.charisma) / 4;
  return 150 + Math.round(avg * 40);
}

/** Garantisce che entrambe le fazioni siano rappresentate. */
function balanceAlignments(draw: Alignment[], minEach: number): Alignment[] {
  const faces = draw.filter((x) => x === "face").length;
  const heels = draw.length - faces;
  if (faces >= minEach && heels >= minEach) return draw;
  const result = [...draw];
  if (faces < minEach) {
    let need = minEach - faces;
    for (let i = result.length - 1; i >= 0 && need > 0; i--) {
      if (result[i] === "heel") {
        result[i] = "face";
        need--;
      }
    }
  } else {
    let need = minEach - heels;
    for (let i = result.length - 1; i >= 0 && need > 0; i--) {
      if (result[i] === "face") {
        result[i] = "heel";
        need--;
      }
    }
  }
  return result;
}

/**
 * Roster iniziale della federazione: deterministico dal seed.
 * Con roster da 4+ sono garantiti almeno 2 beniamini e 2 cattivi.
 */
export function generateInitialRoster(
  seed: string,
  saveId: string,
  startDate: string,
  size = DEFAULT_ROSTER_SIZE
): Wrestler[] {
  const rng = mulberry32(seedFromString(`roster:${seed}`));
  const count = Math.min(Math.max(size, 2), ROSTER_BLUEPRINTS.length);
  const chosen = shuffled(ROSTER_BLUEPRINTS, rng).slice(0, count);
  const minEach = count >= 4 ? 2 : 1;
  const alignments = balanceAlignments(
    chosen.map(() => (rng() < 0.5 ? "face" : "heel")),
    minEach
  );
  return chosen.map((bp, i) => {
    const stats = statsFor(bp.bodyType, rng);
    const weeks = CONTRACT_WEEKS[Math.floor(rng() * CONTRACT_WEEKS.length)];
    return {
      id: `w-${slugify(bp.name)}`,
      saveId,
      name: bp.name,
      nickname: bp.nickname,
      gimmick: bp.gimmick,
      bodyType: bp.bodyType,
      alignment: alignments[i],
      stats,
      signature: bp.signature,
      finisher: bp.finisher,
      colors: { trim: bp.trim, skin: bp.skin },
      contract: {
        weeklyPay: weeklyPayFor(stats),
        signedOn: startDate,
        expiresOn: addWeeks(startDate, weeks),
      },
    };
  });
}
