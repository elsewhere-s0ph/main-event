import type { FederationPhilosophy } from "./career";

// Tipi del mondo (C5, scope ridimensionato su decisione di Flynn):
// le federazioni AI esistono solo come rivali negli ascolti — nomi,
// reputazione e share di pubblico, senza roster né sprite.

export interface AIFederation {
  id: string;
  name: string;
  philosophy: FederationPhilosophy;
  /** Reputazione 1–100: la forza di richiamo di partenza della rivale. */
  reputation: number;
  /** Colore identificativo (hex) per le classifiche. */
  color: string;
}

export interface FederationStanding {
  /** "user" per la federazione del GM, altrimenti l'id della rivale. */
  id: string;
  name: string;
  color: string;
  /** Spettatori della settimana. */
  viewers: number;
  isUser: boolean;
  /** Valutazione dell'ultimo show (solo federazione del GM). */
  rating: number | null;
}
