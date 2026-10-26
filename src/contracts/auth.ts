import { z } from "zod";
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

// Responses

export const AuthResponseSchema = z.strictObject({
  user: PublicUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshResponseSchema = z.strictObject({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const WsTicketResponseSchema = z.strictObject({ ticket: z.string() });
