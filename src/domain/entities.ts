// Entities are the backend's wire types (shared kernel). Type-only imports: the domain has
// no runtime dependency on zod or the contracts module. Dates are ISO-8601 strings.
export type {
  PublicUser as CurrentUser,
  UserSummary,
  UserListItem,
  Room,
  RoomListItem,
  RoomMember,
  RoomWithMembers,
  Message,
  AttachmentMeta,
  AttachmentContentType,
  ServerEvent,
  WsRequestType,
  WsRequestPayload,
  WsAckPayload,
} from "../contracts/index.ts";
