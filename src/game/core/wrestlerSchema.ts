import { z } from "zod";

// Validazione delle modifiche alla scheda wrestler con Zod: la UI non
// passa mai dati non validati al layer di persistenza (Documento Master §2 e §9).

const hexColor = z
  .string()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, "Colore non valido: serve il formato #rrggbb");

const statSchema = z
  .number({ invalid_type_error: "Gli attributi vanno da 1 a 10" })
  .int("Gli attributi devono essere numeri interi")
  .min(1, "Gli attributi vanno da 1 a 10")
  .max(10, "Gli attributi vanno da 1 a 10");

export const wrestlerInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(40, "Il nome non può superare 40 caratteri"),
  nickname: z
    .string()
    .trim()
    .min(2, "Il soprannome deve avere almeno 2 caratteri")
    .max(60, "Il soprannome non può superare 60 caratteri"),
  gimmick: z
    .string()
    .trim()
    .min(2, "La gimmick deve avere almeno 2 caratteri")
    .max(160, "La gimmick non può superare 160 caratteri"),
  bodyType: z.enum(["heavyweight", "cruiserweight"]),
  alignment: z.enum(["face", "heel"]),
  stats: z.object({
    power: statSchema,
    agility: statSchema,
    stamina: statSchema,
    charisma: statSchema,
  }),
  signature: z
    .string()
    .trim()
    .min(2, "La mossa firma deve avere almeno 2 caratteri")
    .max(60, "La mossa firma non può superare 60 caratteri"),
  finisher: z
    .string()
    .trim()
    .min(2, "Il finisher deve avere almeno 2 caratteri")
    .max(60, "Il finisher non può superare 60 caratteri"),
  colors: z.object({
    trim: hexColor,
    skin: hexColor,
  }),
});

export type WrestlerInput = z.infer<typeof wrestlerInputSchema>;

export type WrestlerValidation =
  | { ok: true; value: WrestlerInput }
  | { ok: false; error: string };

export function validateWrestlerInput(raw: unknown): WrestlerValidation {
  const parsed = wrestlerInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  return { ok: true, value: parsed.data };
}
