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

export const UserListItemSchema = PublicUserSchema.extend({ isOnline: z.boolean() });
export type UserListItem = z.infer<typeof UserListItemSchema>;

// Requests

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).trim().optional(),
  avatarUrl: z.url().max(512).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// Responses

export const UserResponseSchema = z.strictObject({ user: PublicUserSchema });
export const UserListResponseSchema = z.strictObject({ users: z.array(UserListItemSchema) });
