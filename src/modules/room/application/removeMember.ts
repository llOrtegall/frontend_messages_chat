import { UserId } from "../../user/domain/UserId.ts";
import { RoomId } from "../domain/RoomId.ts";
import type { RoomRepository } from "../domain/RoomRepository.ts";
import type { MembershipInput } from "./addMember.ts";

/** Removes someone else, or leaves when `userId` is the requester. */
export const removeMember = ({ roomRepository }: { readonly roomRepository: RoomRepository }) =>
  async ({ roomId, userId }: MembershipInput): Promise<void> =>
    roomRepository.removeMember(RoomId.fromPrimitive(roomId), UserId.fromPrimitive(userId));
