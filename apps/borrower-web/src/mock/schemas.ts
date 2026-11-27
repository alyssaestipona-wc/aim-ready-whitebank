import { z } from "zod"

/*
 * Form schemas. They move to packages/contracts once apps/api defines the
 * matching request types. Business validation (credentials, limits, consents)
 * stays in the mock actions so error copy matches the prototype exactly.
 */

export const signInSchema = z.object({
  email: z.string(),
  password: z.string(),
})
export type SignInValues = z.infer<typeof signInSchema>

export const signSchema = z.object({
  name: z.string(),
  agree: z.boolean(),
})
export type SignValues = z.infer<typeof signSchema>

export const uploadSchema = z.object({
  file: z.enum(["", "ok", "type", "size"]),
})
export type UploadValues = z.infer<typeof uploadSchema>

export const applySchema = z.object({
  product: z.enum(["PL", "SL"]),
  amount: z.number().nullable(),
  tenor: z.number().int().positive(),
  income: z.number().nullable(),
  obligations: z.number().nullable(),
  purpose: z.string(),
  consentCredit: z.boolean(),
  consentData: z.boolean(),
  consentTerms: z.boolean(),
})
export type ApplyValues = z.infer<typeof applySchema>
