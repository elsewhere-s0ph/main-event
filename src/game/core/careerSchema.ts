import { z } from "zod";

// Validazione degli input utente con Zod: la UI non passa mai dati non
// validati al layer di persistenza (Documento Master §2 e §9).

export const federationNameSchema = z
  .string()
  .trim()
  .min(2, "Il nome della federazione deve avere almeno 2 caratteri")
  .max(40, "Il nome della federazione non può superare 40 caratteri");

export const gmNameSchema = z
  .string()
  .trim()
  .min(2, "Il nome del GM deve avere almeno 2 caratteri")
  .max(40, "Il nome del GM non può superare 40 caratteri");

export const seedSchema = z
  .string()
  .trim()
  .max(64, "Il seed non può superare 64 caratteri")
  .default("");

export const careerInputSchema = z.object({
  federationName: federationNameSchema,
  gmName: gmNameSchema,
  seed: seedSchema,
});

export type CareerInput = z.infer<typeof careerInputSchema>;

export type ValidationResult =
  | { ok: true; value: CareerInput }
  | { ok: false; error: string };

export function validateCareerInput(raw: unknown): ValidationResult {
  const parsed = careerInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  return { ok: true, value: parsed.data };
}
