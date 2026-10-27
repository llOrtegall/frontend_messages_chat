import { z } from "zod";

// Wire format shared with the frontend. This folder must only depend on `zod`:
// the frontend copies it verbatim (see README "Contratos").

export const Id = z.uuid();

/** Dates travel as ISO-8601 strings (JSON.stringify of a Date). */
export const IsoDateTime = z.iso.datetime();

/** `code` is stable (e.g. `room.not_member`): clients map it to their own messages; `error` is for logs. */
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
