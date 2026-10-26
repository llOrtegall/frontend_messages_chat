import { z } from "zod";
import { Id, IsoDateTime } from "./common.ts";
import { UserSummarySchema } from "./users.ts";

export const RoomKindSchema = z.enum(["dm", "group"]);
export const RoomRoleSchema = z.enum(["owner", "admin", "member"]);

export const RoomSchema = z.strictObject({
  id: Id,
  kind: RoomKindSchema,
  name: z.string().nullable(),
  createdBy: Id.nullable(),
  lastMessageAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});
export type Room = z.infer<typeof RoomSchema>;

/** GET /rooms item: the room plus the requester's own read state. */
export const RoomListItemSchema = RoomSchema.extend({
  unreadCount: z.number().int().min(0),
  lastReadMessageId: Id.nullable(),
  /** DMs: the other member (for the title). Null for groups. */
  peer: UserSummarySchema.nullable(),
});
export type RoomListItem = z.infer<typeof RoomListItemSchema>;

export const RoomMemberSchema = z.strictObject({
  userId: Id,
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: RoomRoleSchema,
  joinedAt: IsoDateTime,
  lastReadMessageId: Id.nullable(),
  mutedUntil: IsoDateTime.nullable(),
});
export type RoomMember = z.infer<typeof RoomMemberSchema>;

export const RoomWithMembersSchema = RoomSchema.extend({ members: z.array(RoomMemberSchema) });
export type RoomWithMembers = z.infer<typeof RoomWithMembersSchema>;

// Requests

export const CreateDirectRoomSchema = z.object({
  targetUserId: Id,
});
export type CreateDirectRoomInput = z.infer<typeof CreateDirectRoomSchema>;

export const CreateGroupRoomSchema = z.object({
  name: z.string().min(1).max(128).trim(),
  memberIds: z.array(Id).max(99).default([]),
});
export type CreateGroupRoomInput = z.infer<typeof CreateGroupRoomSchema>;

export const AddMemberSchema = z.object({
  userId: Id,
  role: z.enum(["admin", "member"]).default("member"),
});
export type AddMemberInput = z.infer<typeof AddMemberSchema>;

export const RemoveMemberSchema = z.object({
  userId: Id,
});

/** Owner only. Ownership itself is not transferable. */
export const UpdateMemberRoleSchema = z.object({
  userId: Id,
  role: z.enum(["admin", "member"]),
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

// Responses

export const RoomResponseSchema = z.strictObject({ room: RoomSchema });
export const RoomDetailResponseSchema = z.strictObject({ room: RoomWithMembersSchema });
export const RoomListResponseSchema = z.strictObject({ rooms: z.array(RoomListItemSchema) });
export const MemberResponseSchema = z.strictObject({ member: RoomMemberSchema });
