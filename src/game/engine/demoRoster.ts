import type { WrestlerDef } from "../types/match";

// Roster dimostrativo del prototipo C2. Nomi e gimmick sono provvisori:
// la scelta definitiva spetta a Flynn (Documento Master §11).

export const DEMO_WRESTLERS: readonly [WrestlerDef, WrestlerDef] = [
  {
    id: "skullcrusher",
    name: "Skullcrusher",
    nickname: "La parete tatuata",
    bodyType: "heavyweight",
    finisher: "Sit-Out Powerbomb",
    colors: { trim: "#f97316", skin: "#a05e33" },
    stats: { power: 9, agility: 4, stamina: 8 },
    bald: true,
    tattoo: "skull",
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
