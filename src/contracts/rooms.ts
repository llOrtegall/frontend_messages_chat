import { z } from "zod";
import { Id, IsoDateTime } from "./common.ts";

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

export const RoomMemberSchema = z.strictObject({
  userId: Id,
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

// Responses

export const RoomResponseSchema = z.strictObject({ room: RoomSchema });
export const RoomDetailResponseSchema = z.strictObject({ room: RoomWithMembersSchema });
export const RoomListResponseSchema = z.strictObject({ rooms: z.array(RoomSchema) });
export const MemberResponseSchema = z.strictObject({ member: RoomMemberSchema });
