import { UserId } from "../../user/domain/UserId.ts";
import { MemberRole } from "../domain/MemberRole.ts";
import { RoomId } from "../domain/RoomId.ts";
import type { RoomMember } from "../domain/RoomMember.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";
import type { MembershipInput } from "./addMember.ts";

export interface ChangeMemberRoleInput extends MembershipInput {
  readonly role: string;
}

export const changeMemberRole = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async ({ roomId, userId, role }: ChangeMemberRoleInput): Promise<RoomMember> =>
    roomRepository.changeRole(RoomId.fromPrimitive(roomId), UserId.fromPrimitive(userId), MemberRole.create(role));
