import { z } from "zod";
import { Id, IsoDateTime } from "./common.ts";

export const PublicUserSchema = z.strictObject({
  id: Id,
  email: z.email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  emailVerifiedAt: IsoDateTime.nullable(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

/** Another user's profile: no email. */
export const UserSummarySchema = z.strictObject({
  id: Id,
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UserListItemSchema = UserSummarySchema.extend({ isOnline: z.boolean() });
export type UserListItem = z.infer<typeof UserListItemSchema>;

// Requests

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).trim().optional(),
  /** An image uploaded via /attachments/presign (the server derives avatarUrl); null removes it. */
  avatarKey: z.string().max(512).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** GET /users: `q` matches display names (substring) or an email (exact). */
export const ListUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(512).optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

// Responses

export const UserResponseSchema = z.strictObject({ user: PublicUserSchema });
export const UserSummaryResponseSchema = z.strictObject({ user: UserSummarySchema });
export const UserListResponseSchema = z.strictObject({
  users: z.array(UserListItemSchema),
  nextCursor: z.string().nullable(),
});
