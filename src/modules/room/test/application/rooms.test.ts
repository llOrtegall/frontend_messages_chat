import { describe, expect, it } from "bun:test";
import { faker } from "@faker-js/faker";
import { addMember } from "../../application/addMember.ts";
import { changeMemberRole } from "../../application/changeMemberRole.ts";
import { createGroupRoom } from "../../application/createGroupRoom.ts";
import { deleteRoom } from "../../application/deleteRoom.ts";
import { findRoom } from "../../application/findRoom.ts";
import { openDirectRoom } from "../../application/openDirectRoom.ts";
import { removeMember } from "../../application/removeMember.ts";
import { InvalidRoomError } from "../../domain/errors/InvalidRoomError.ts";
import { InvalidUserIdError } from "../../../user/domain/errors/InvalidUserIdError.ts";
import * as RoomRepositoryMother from "../helpers/RoomRepositoryMother.ts";

const roomId = faker.string.uuid();
const userId = faker.string.uuid();

describe("room use cases", () => {
  it("open, find and delete rooms by their ids", async () => {
    const roomRepository = RoomRepositoryMother.create();

    await openDirectRoom({ roomRepository })(userId);
    await findRoom({ roomRepository })(roomId);
    await deleteRoom({ roomRepository })(roomId);

    expect(roomRepository.openDirect.mock.calls[0]![0].toPrimitive()).toBe(userId);
    expect(roomRepository.find.mock.calls[0]![0].toPrimitive()).toBe(roomId);
    expect(roomRepository.delete.mock.calls[0]![0].toPrimitive()).toBe(roomId);
  });

  it("creates a group with a trimmed name and its first members", async () => {
    const roomRepository = RoomRepositoryMother.create();

    await createGroupRoom({ roomRepository })({ name: "  Team ", memberIds: [userId] });

    const [name, memberIds] = roomRepository.createGroup.mock.calls[0]!;
    expect(name.toPrimitive()).toBe("Team");
    expect(memberIds.map((id) => id.toPrimitive())).toEqual([userId]);
  });

  it("adds, removes and changes the role of members", async () => {
    const roomRepository = RoomRepositoryMother.create();

    await addMember({ roomRepository })({ roomId, userId });
    await removeMember({ roomRepository })({ roomId, userId });
    await changeMemberRole({ roomRepository })({ roomId, userId, role: "admin" });

    expect(roomRepository.addMember).toHaveBeenCalledTimes(1);
    expect(roomRepository.removeMember).toHaveBeenCalledTimes(1);
    expect(roomRepository.changeRole.mock.calls[0]![2].toPrimitive()).toBe("admin");
  });

  it("sends nothing the backend would refuse", async () => {
    const roomRepository = RoomRepositoryMother.create();

    await expect(createGroupRoom({ roomRepository })({ name: " ", memberIds: [] })).rejects.toThrow(InvalidRoomError);
    await expect(changeMemberRole({ roomRepository })({ roomId, userId, role: "king" })).rejects.toThrow(InvalidRoomError);
    await expect(addMember({ roomRepository })({ roomId, userId: "u1" })).rejects.toThrow(InvalidUserIdError);

    expect(roomRepository.createGroup).not.toHaveBeenCalled();
    expect(roomRepository.changeRole).not.toHaveBeenCalled();
    expect(roomRepository.addMember).not.toHaveBeenCalled();
  });
});
