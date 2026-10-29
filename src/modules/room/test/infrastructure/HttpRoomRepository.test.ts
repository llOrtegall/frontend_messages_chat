import { afterEach, describe, expect, it } from "bun:test";
import { ApiHttp } from "../../../shared/infrastructure/ApiHttp.ts";
import { UserId } from "../../../user/domain/UserId.ts";
import { MemberRole } from "../../domain/MemberRole.ts";
import { RoomId } from "../../domain/RoomId.ts";
import { RoomName } from "../../domain/RoomName.ts";
import { HttpRoomRepository } from "../../infrastructure/HttpRoomRepository.ts";
import * as RoomMother from "../helpers/RoomMother.ts";

let server: ReturnType<typeof Bun.serve> | null = null;
afterEach(() => {
  server?.stop(true);
  server = null;
});

const respond = (handler: (request: Request, body: unknown) => Response) => {
  const seen: { method: string; path: string; body: unknown }[] = [];
  server = Bun.serve({
    port: 0,
    async fetch(request) {
      const body = await request.json().catch(() => null);
      seen.push({ method: request.method, path: new URL(request.url).pathname, body });
      return handler(request, body);
    },
  });
  return { seen, repository: new HttpRoomRepository(new ApiHttp(`http://localhost:${server.port}`)) };
};

describe("HttpRoomRepository", () => {
  it("maps the room list, keeping the requester's mute", async () => {
    const listed = RoomMother.listedPrimitive({ mutedUntil: "2026-12-01T00:00:00.000Z" });
    const { repository } = respond(() => Response.json({ rooms: [listed] }));

    expect((await repository.list()).toPrimitive()).toEqual([listed]);
  });

  it("joins a created group with nothing unread yet", async () => {
    const room = RoomMother.newRoomPrimitive();
    const { seen, repository } = respond(() => Response.json({ room }, { status: 201 }));
    const memberId = UserId.fromPrimitive(crypto.randomUUID());

    const created = await repository.createGroup(RoomName.create("Team"), [memberId]);

    expect(created.toPrimitive()).toMatchObject({ ...room, unreadCount: 0, peer: null });
    expect(seen[0]!.body).toEqual({ name: "Team", memberIds: [memberId.toPrimitive()] });
  });

  it("changes a role through the members endpoint and maps the member back", async () => {
    const member = RoomMother.memberPrimitive({ role: "admin" });
    const { seen, repository } = respond(() => Response.json({ member }));
    const roomId = RoomId.fromPrimitive(crypto.randomUUID());

    const changed = await repository.changeRole(roomId, UserId.fromPrimitive(member.userId), MemberRole.admin());

    expect(changed.toPrimitive()).toEqual(member);
    expect(seen[0]).toEqual({ method: "PATCH", path: `/api/v1/rooms/${roomId.toPrimitive()}/members`, body: { userId: member.userId, role: "admin" } });
  });
});
