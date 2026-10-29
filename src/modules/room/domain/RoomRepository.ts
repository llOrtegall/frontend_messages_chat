import type { UserId } from "../../user/domain/UserId.ts";
import type { ListedRoom } from "./ListedRoom.ts";
import type { ListedRoomList } from "./ListedRoomList.ts";
import type { MemberRole } from "./MemberRole.ts";
import type { Room } from "./Room.ts";
import type { RoomId } from "./RoomId.ts";
import type { RoomMember } from "./RoomMember.ts";
import type { RoomName } from "./RoomName.ts";

export interface RoomRepository {
  /** The user's rooms with their own read state. */
  list(): Promise<ListedRoomList>;
  find(id: RoomId): Promise<Room>;
  /** The direct room with that user, created if it didn't exist. */
  openDirect(withUser: UserId): Promise<ListedRoom>;
  createGroup(name: RoomName, memberIds: readonly UserId[]): Promise<ListedRoom>;
  delete(id: RoomId): Promise<void>;
  addMember(id: RoomId, userId: UserId): Promise<RoomMember>;
  /** Removing yourself is leaving. */
  removeMember(id: RoomId, userId: UserId): Promise<void>;
  changeRole(id: RoomId, userId: UserId, role: MemberRole): Promise<RoomMember>;
}
