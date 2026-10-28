import { z } from "zod";
import { Id, IsoDateTime } from "./common.ts";
import { PublicUserSchema } from "./users.ts";

// Requests

export const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(64).trim(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof RefreshSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const RequestPasswordResetSchema = z.object({
  email: z.email(),
});

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Responses

// Browsers (requests from an allowed Origin, or `X-Client-Type: web`) receive the refresh token
// only as the HttpOnly `rt` cookie, so `refreshToken` is absent for them; other clients get it here.

export const AuthResponseSchema = z.strictObject({
  user: PublicUserSchema,
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshResponseSchema = z.strictObject({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const WsTicketResponseSchema = z.strictObject({ ticket: z.string() });

/** A device the user is signed in with; `id` is what `DELETE /auth/sessions/:id` takes. */
export const SessionSchema = z.strictObject({
  id: Id,
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  startedAt: IsoDateTime,
  lastUsedAt: IsoDateTime,
  current: z.boolean(),
});
export type SessionInfo = z.infer<typeof SessionSchema>;

export const SessionListResponseSchema = z.strictObject({ sessions: z.array(SessionSchema) });
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;
