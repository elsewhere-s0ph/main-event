import { z } from "zod";

// Validazione di creazione e rinomina dei titoli con Zod: anche qui la UI
// non passa mai dati non validati al layer di persistenza.

export const CHAMPIONSHIP_CATEGORIES = ["world", "secondary", "cruiserweight"] as const;

export type ChampionshipCategoryInput = (typeof CHAMPIONSHIP_CATEGORIES)[number];

export const titleNameSchema = z
  .string()
  .trim()
  .min(2, "Il nome del titolo deve avere almeno 2 caratteri")
  .max(40, "Il nome del titolo non può superare 40 caratteri");

export const titleInputSchema = z.object({
  name: titleNameSchema,
  category: z.enum(CHAMPIONSHIP_CATEGORIES, {
    errorMap: () => ({ message: "Categoria del titolo non valida" }),
  }),
});

export type TitleInput = z.infer<typeof titleInputSchema>;

export type TitleValidation =
  | { ok: true; value: TitleInput }
  | { ok: false; error: string };

export function validateTitleInput(raw: unknown): TitleValidation {
  const parsed = titleInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  return { ok: true, value: parsed.data };
}

export type TitleNameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateTitleName(raw: unknown): TitleNameValidation {
  const parsed = titleNameSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome non valido" };
  }
  return { ok: true, value: parsed.data };
}
