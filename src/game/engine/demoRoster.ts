import type { WrestlerDef } from "../types/match";

// Roster dimostrativo del prototipo C2. Nomi e gimmick sono provvisori:
// la scelta definitiva spetta a Flynn (Documento Master §11).

export const DEMO_WRESTLERS: readonly [WrestlerDef, WrestlerDef] = [
  {
    id: "monolite",
    name: "Il Monolite",
    nickname: "La parete che cammina",
    bodyType: "heavyweight",
    finisher: "Frana Mortale",
    colors: { trim: "#2dd4bf", skin: "#d9b08c" },
    stats: { power: 9, agility: 4, stamina: 8 },
  },
  {
    id: "vespa",
    name: "Vespa",
    nickname: "Il fulmine dei quartieri",
    bodyType: "cruiserweight",
    finisher: "Pungiglione",
    colors: { trim: "#ef6b6b", skin: "#e8c39e" },
    stats: { power: 4, agility: 9, stamina: 6 },
  },
];
