import { afterEach, describe, expect, it, mock } from "bun:test";
import { faker } from "@faker-js/faker";
import { ChatSession, type ChatModules } from "../../src/hooks/ChatSession.ts";
import type { MessageList } from "../../src/modules/message/domain/MessageList.ts";
import * as MessageMother from "../../src/modules/message/test/helpers/MessageMother.ts";
import type { ChatEvent } from "../../src/modules/realtime/domain/ChatEvent.ts";
import type { ConnectionStatus } from "../../src/modules/realtime/domain/ConnectionStatus.ts";
import { ListedRoomList } from "../../src/modules/room/domain/ListedRoomList.ts";
import { Room } from "../../src/modules/room/domain/Room.ts";
import { RoomId } from "../../src/modules/room/domain/RoomId.ts";
import * as RoomMother from "../../src/modules/room/test/helpers/RoomMother.ts";
import { RequestFailedError } from "../../src/modules/shared/domain/errors/RequestFailedError.ts";
import { UserId } from "../../src/modules/user/domain/UserId.ts";
import { MessageList as Messages } from "../../src/modules/message/domain/MessageList.ts";

const ME = faker.string.uuid();
const OTHER = faker.string.uuid();
const OPTIONS = { pageSize: 2, typingTtlMs: 30, typingThrottleMs: 1000 };

let session: ChatSession | null = null;
afterEach(() => session?.stop());

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A session over fake modules; `emit` and `status` play the realtime channel. */
const setUp = (rooms = [RoomMother.listed({ unreadCount: 0 })]) => {
  let onEvent: (event: ChatEvent) => void = () => {};
  let onStatus: (status: ConnectionStatus) => void = () => {};
  let roomList = ListedRoomList.create(rooms);
  const pages: MessageList[] = [];
  const modules = {
    chat: {
      connectRealtime: mock(() => {}),
      disconnectRealtime: mock(() => {}),
      followRooms: mock((roomIds: readonly string[]) => void roomIds),
      watchChatEvents: mock((listener: (event: ChatEvent) => void) => ((onEvent = listener), () => (onEvent = () => {}))),
      watchConnection: mock((listener: (status: ConnectionStatus) => void) => ((onStatus = listener), () => (onStatus = () => {}))),
      sendMessage: mock(async () => {
        throw new RequestFailedError(RequestFailedError.DISCONNECTED, null);
      }),
      editMessage: mock(async () => {}),
      deleteMessage: mock(async () => {}),
      markRoomRead: mock(async () => {}),
      notifyTyping: mock((roomId: string) => void roomId),
    },
    rooms: {
      listRooms: mock(async () => roomList),
      findRoom: mock(async (roomId: string) => Room.fromPrimitive(RoomMother.createPrimitive({ id: roomId }))),
    },
    messages: { listMessages: mock(async () => pages.shift() ?? Messages.empty()) },
  };
  session = new ChatSession(ME, modules as unknown as ChatModules, OPTIONS);
  session.start();
  return {
    session,
    modules,
    pages,
    emit: (event: ChatEvent) => onEvent(event),
    status: (value: ConnectionStatus) => onStatus(value),
    setRooms: (next: ListedRoomList) => (roomList = next),
    chat: () => session!.getSnapshot().chat,
  };
};

const messageFrom = (roomId: string, senderId = OTHER) => MessageMother.create({ roomId, senderId });

describe("ChatSession", () => {
  it("loads the rooms on every connect and follows them", async () => {
    const { modules, status, chat } = setUp();

    status("open");
    await flush();

    expect(modules.chat.connectRealtime).toHaveBeenCalledTimes(1);
    expect(chat().getRooms()?.count()).toBe(1);
    expect(modules.chat.followRooms.mock.calls.at(-1)![0]).toEqual(chat().roomIds().map((id) => id.toPrimitive()));
  });

  it("keeps a room opened while the room list was still loading", async () => {
    const room = RoomMother.listed({ unreadCount: 0 });
    const { session, modules, chat } = setUp([room]);
    let finishLoading: (list: ListedRoomList) => void = () => {};
    modules.rooms.listRooms.mockImplementationOnce(() => new Promise((resolve) => (finishLoading = resolve)));

    const reloading = session.reloadRooms();
    await session.selectRoom(room.getId().toPrimitive());
    finishLoading(ListedRoomList.create([room]));
    await reloading;

    expect(chat().getOpenRoomId()?.equals(room.getId())).toBe(true);
  });

  it("opens a room with its members and first page, and acknowledges it read only once", async () => {
    const room = RoomMother.listed({ unreadCount: 3 });
    const roomId = room.getId().toPrimitive();
    const { session, modules, pages, status, chat } = setUp([room]);
    status("open");
    await flush();
    pages.push(Messages.create([messageFrom(roomId)]));

    await session.selectRoom(roomId);
    await session.selectRoom(roomId);

    expect(chat().getOpenRoom()?.getId().equals(room.getId())).toBe(true);
    expect(chat().getRooms()?.find(room.getId())?.getUnreadCount()).toBe(0);
    expect(modules.chat.markRoomRead).toHaveBeenCalledTimes(1);
  });

  it("pages back until the start of the room", async () => {
    const roomId = RoomMother.listed().getId().toPrimitive();
    const { session, modules, pages, chat } = setUp();
    pages.push(Messages.create([messageFrom(roomId), messageFrom(roomId)]), Messages.create([messageFrom(roomId)]));

    await session.selectRoom(roomId);
    await session.loadOlder(roomId);
    await session.loadOlder(roomId);

    expect(modules.messages.listMessages).toHaveBeenCalledTimes(2);
    expect(chat().historyOf(RoomId.fromPrimitive(roomId))?.getMessages().count()).toBe(3);
  });

  it("surfaces a failed send with the action and its cause, until dismissed", async () => {
    const { session } = setUp();

    expect(await session.send(faker.string.uuid(), "hola")).toBe(false);
    expect(session.getSnapshot().failure).toMatchObject({ action: "message.send" });
    expect((session.getSnapshot().failure?.cause as RequestFailedError).code).toBe(RequestFailedError.DISCONNECTED);

    session.dismissFailure();
    expect(session.getSnapshot().failure).toBeNull();
  });

  it("times out someone else's typing and throttles the user's own notices", async () => {
    const room = RoomMother.listed();
    const { session, modules, emit, chat } = setUp([room]);

    emit({ type: "user.typing", roomId: room.getId(), userId: UserId.fromPrimitive(OTHER) });
    session.notifyTyping(room.getId().toPrimitive());
    session.notifyTyping(room.getId().toPrimitive());

    expect(chat().typistsIn(room.getId())).toHaveLength(1);
    expect(modules.chat.notifyTyping).toHaveBeenCalledTimes(1);
    await Bun.sleep(OPTIONS.typingTtlMs + 20);
    expect(chat().typistsIn(room.getId())).toHaveLength(0);
  });

  it("reloads the list when a direct room appears, to learn who it is with", async () => {
    const { modules, emit } = setUp();

    emit({ type: "room.added", room: RoomMother.listed({ kind: "dm", name: null }) });
    await flush();

    expect(modules.rooms.listRooms).toHaveBeenCalledTimes(1);
  });

  it("stops listening, follows no room and disconnects", () => {
    const { session: stopped, modules, emit, chat } = setUp();

    stopped.stop();
    emit({ type: "presence.changed", userId: UserId.fromPrimitive(OTHER), isOnline: true });

    expect(modules.chat.disconnectRealtime).toHaveBeenCalledTimes(1);
    expect(modules.chat.followRooms.mock.calls.at(-1)![0]).toEqual([]);
    expect(chat().isOnline(UserId.fromPrimitive(OTHER), false)).toBe(false);
    session = null;
  });
});
