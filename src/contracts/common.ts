import { z } from "zod";

// Wire format shared with the frontend. This folder must only depend on `zod`:
// the frontend copies it verbatim (see README "Contratos").

export const Id = z.uuid();

/** Dates travel as ISO-8601 strings (JSON.stringify of a Date). */
export const IsoDateTime = z.iso.datetime();

export const ApiErrorSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
