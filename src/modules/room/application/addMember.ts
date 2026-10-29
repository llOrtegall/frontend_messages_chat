import { UserId } from "../../user/domain/UserId.ts";
import { RoomId } from "../domain/RoomId.ts";
import type { RoomMember } from "../domain/RoomMember.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";

export interface MembershipInput {
  readonly roomId: string;
  readonly userId: string;
}

export const addMember = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async ({ roomId, userId }: MembershipInput): Promise<RoomMember> =>
    roomRepository.addMember(RoomId.fromPrimitive(roomId), UserId.fromPrimitive(userId));
