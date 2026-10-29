import { MemberResponseSchema, RoomDetailResponseSchema, RoomListResponseSchema, RoomResponseSchema } from "../../../contracts/index.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import type { UserId } from "../../user/domain/UserId.ts";
import { ListedRoom } from "../domain/ListedRoom.ts";
import { ListedRoomList } from "../domain/ListedRoomList.ts";
import type { MemberRole } from "../domain/MemberRole.ts";
import { Room } from "../domain/Room.ts";
import type { RoomId } from "../domain/RoomId.ts";
import { RoomMember } from "../domain/RoomMember.ts";
import type { RoomName } from "../domain/RoomName.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

const ROOMS = "/api/v1/rooms";
const roomPath = (id: RoomId) => `${ROOMS}/${id.toPrimitive()}`;

export class HttpRoomRepository implements RoomRepository {
  constructor(private readonly http: ApiHttp) {}

  async list(): Promise<ListedRoomList> {
    return ListedRoomList.fromPrimitive((await this.http.request("GET", ROOMS, RoomListResponseSchema)).rooms);
  }

  async find(id: RoomId): Promise<Room> {
    return Room.fromPrimitive((await this.http.request("GET", roomPath(id), RoomDetailResponseSchema)).room);
  }

  async openDirect(withUser: UserId): Promise<ListedRoom> {
    const { room } = await this.http.request("POST", ROOMS, RoomResponseSchema, { body: { targetUserId: withUser.toPrimitive() } });
    return ListedRoom.joined(room);
  }

  async createGroup(name: RoomName, memberIds: readonly UserId[]): Promise<ListedRoom> {
    const { room } = await this.http.request("POST", ROOMS, RoomResponseSchema, {
      body: { name: name.toPrimitive(), memberIds: memberIds.map((id) => id.toPrimitive()) },
    });
    return ListedRoom.joined(room);
  }

  async delete(id: RoomId): Promise<void> {
    await this.http.request("DELETE", roomPath(id), null);
  }

  async addMember(id: RoomId, userId: UserId): Promise<RoomMember> {
    const { member } = await this.http.request("POST", `${roomPath(id)}/members`, MemberResponseSchema, {
      body: { userId: userId.toPrimitive() },
    });
    return RoomMember.fromPrimitive(member);
  }

  async removeMember(id: RoomId, userId: UserId): Promise<void> {
    await this.http.request("DELETE", `${roomPath(id)}/members`, null, { body: { userId: userId.toPrimitive() } });
  }

  async changeRole(id: RoomId, userId: UserId, role: MemberRole): Promise<RoomMember> {
    const { member } = await this.http.request("PATCH", `${roomPath(id)}/members`, MemberResponseSchema, {
      body: { userId: userId.toPrimitive(), role: role.toPrimitive() },
    });
    return RoomMember.fromPrimitive(member);
  }
}
