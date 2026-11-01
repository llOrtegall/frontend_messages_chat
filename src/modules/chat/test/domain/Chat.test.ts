import { describe, expect, it } from "bun:test";
import { Message } from "../../../message/domain/Message.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import { ListedRoomList } from "../../../room/domain/ListedRoomList.ts";
import { Room } from "../../../room/domain/Room.ts";
import { RoomMember } from "../../../room/domain/RoomMember.ts";
import * as RoomMother from "../../../room/test/helpers/RoomMother.ts";
import { UserId } from "../../../user/domain/UserId.ts";
import { Chat } from "../../domain/Chat.ts";
import * as ChatMother from "../helpers/ChatMother.ts";

const { me, other } = ChatMother;
const unreadOf = (chat: ReturnType<typeof ChatMother.withRooms>["chat"], roomId: Parameters<typeof chat.historyOf>[0]) =>
  chat.getRooms()?.find(roomId)?.getUnreadCount();

describe("Chat", () => {
  describe("Rooms and reading", () => {
    it("takes the server's unread counts, except for the open room, which is being read", () => {
      const { chat, busy, quiet } = ChatMother.withRooms();

      const reloaded = chat.opened(quiet).roomsLoaded(ListedRoomList.fromPrimitive(chat.getRooms()!.toPrimitive().map((room) => ({ ...room, unreadCount: 5 }))));

      expect(unreadOf(reloaded, busy)).toBe(5);
      expect(unreadOf(reloaded, quiet)).toBe(0);
    });

    it("clears a room's unread count when it is opened, and forgets a detail that arrives for another room", () => {
      const { chat, busy, quiet } = ChatMother.withRooms();

      const opened = chat.opened(quiet);
      const late = opened.opened(busy).openRoomLoaded(Room.fromPrimitive(RoomMother.createPrimitive({ id: quiet.toPrimitive() })));

      expect(unreadOf(opened, quiet)).toBe(0);
      expect(late.getOpenRoom()).toBeNull();
      expect(chat.getOpenRoomId()).toBeNull();
    });

    it("asks to acknowledge the newest message once, again after a failure, and never while offline", () => {
      const { chat, busy } = ChatMother.withRooms();
      const message = ChatMother.messageIn(busy);
      const loaded = chat.opened(busy).olderPageLoaded(busy, ChatMother.page(message), 50);

      const mark = loaded.pendingReadMark(busy);
      const sent = loaded.readMarkSent(busy, mark!);

      expect(mark?.equals(message.getId())).toBe(true);
      expect(sent.pendingReadMark(busy)).toBeNull();
      expect(sent.readMarkFailed(busy, mark!).pendingReadMark(busy)?.equals(mark!)).toBe(true);
      expect(loaded.connectionChanged("closed").pendingReadMark(busy)).toBeNull();
    });
  });

  describe("Message events", () => {
    it("moves the room up and counts a message from someone else once, without loading a history never opened", () => {
      const { chat, quiet } = ChatMother.withRooms();
      const event = ChatMother.created(ChatMother.messageIn(quiet));

      const { chat: next, effects } = chat.apply(event);
      const repeated = next.apply(event).chat;

      expect(next.getRooms()!.map((room) => room.getId())[0]?.equals(quiet)).toBe(true);
      expect(unreadOf(repeated, quiet)).toBe(3);
      expect(next.historyOf(quiet)).toBeNull();
      expect(effects).toEqual([]);
    });

    it("adds a message to the open room, stops its sender's typing and asks to mark it read", () => {
      const { chat, busy } = ChatMother.withRooms();
      const open = chat.opened(busy).olderPageLoaded(busy, ChatMother.page(), 50).typingStarted(busy, other);

      const { chat: next, effects } = open.apply(ChatMother.created(ChatMother.messageIn(busy)));

      expect(next.historyOf(busy)?.getMessages().count()).toBe(1);
      expect(next.typistsIn(busy)).toEqual([]);
      expect(effects).toEqual([{ type: "markRead", roomId: busy }]);
      expect(unreadOf(next, busy)).toBe(0);
    });

    it("doesn't count nor acknowledge the user's own messages", () => {
      const { chat, quiet } = ChatMother.withRooms();

      const { chat: next, effects } = chat.apply(ChatMother.created(ChatMother.messageIn(quiet, me)));

      expect(unreadOf(next, quiet)).toBe(2);
      expect(effects).toEqual([]);
    });

    it("applies edits and deletions to loaded histories", () => {
      const { chat, busy } = ChatMother.withRooms();
      const message = ChatMother.messageIn(busy, other, { body: "hola" });
      const loaded = chat.olderPageLoaded(busy, ChatMother.page(message), 50);

      const edited = loaded.apply({ type: "message.edited", message: Message.fromPrimitive({ ...message.toPrimitive(), body: "hola (editado)" }) }).chat;
      const deleted = edited.apply({ type: "message.deleted", roomId: busy, messageId: message.getId() }).chat;

      expect(edited.historyOf(busy)?.getMessages().toPrimitive()[0]?.body).toBe("hola (editado)");
      expect(deleted.historyOf(busy)?.getMessages().isEmpty()).toBe(true);
    });

    it("clears the badge when the user read the room on another device", () => {
      const { chat, quiet } = ChatMother.withRooms();

      const next = chat.apply({ type: "message.read", roomId: quiet, userId: me, messageId: ChatMother.messageIn(quiet).getId() }).chat;

      expect(unreadOf(next, quiet)).toBe(0);
    });
  });

  describe("Page visibility", () => {
    const hiddenWithOpenRoom = () => {
      const { chat, busy, quiet } = ChatMother.withRooms();
      const open = chat.opened(busy).olderPageLoaded(busy, ChatMother.page(ChatMother.messageIn(busy)), 50).pageHidden();
      return { chat: open, busy, quiet };
    };

    it("counts what arrives in the open room as unread, and reads nothing, while the page is out of view", () => {
      const { chat, busy } = hiddenWithOpenRoom();

      const { chat: next, effects } = chat.apply(ChatMother.created(ChatMother.messageIn(busy)));

      expect(effects).toEqual([]);
      expect(unreadOf(next, busy)).toBe(1);
      expect(next.pendingReadMark(busy)).toBeNull();
    });

    it("keeps the server's count for the open room when the rooms reload out of view", () => {
      const { chat, busy } = hiddenWithOpenRoom();

      const reloaded = chat.roomsLoaded(ListedRoomList.fromPrimitive(chat.getRooms()!.toPrimitive().map((room) => ({ ...room, unreadCount: 4 }))));

      expect(unreadOf(reloaded, busy)).toBe(4);
    });

    it("reads the open room once the page is back in view, and only on the way back", () => {
      const { chat, busy } = hiddenWithOpenRoom();
      const unread = chat.apply(ChatMother.created(ChatMother.messageIn(busy))).chat;

      const shown = unread.pageShown();

      expect(unreadOf(shown.chat, busy)).toBe(0);
      expect(shown.effects).toEqual([{ type: "markRead", roomId: busy }]);
      expect(shown.chat.pendingReadMark(busy)).not.toBeNull();
      expect(shown.chat.pageShown().effects).toEqual([]);
    });
  });

  describe("Typing and presence", () => {
    it("shows someone else typing until it stops, and asks to time it out", () => {
      const { chat, busy } = ChatMother.withRooms();

      const { chat: typing, effects } = chat.apply({ type: "user.typing", roomId: busy, userId: other });

      expect(typing.typistsIn(busy)).toEqual([other]);
      expect(effects).toEqual([{ type: "typingStarted", roomId: busy, userId: other }]);
      expect(typing.typingStopped(busy, other).typistsIn(busy)).toEqual([]);
      expect(chat.apply({ type: "user.typing", roomId: busy, userId: me }).chat.typistsIn(busy)).toEqual([]);
    });

    it("prefers live presence over what the directory said", () => {
      const { chat } = ChatMother.withRooms();

      const next = chat.apply({ type: "presence.changed", userId: other, isOnline: false }).chat;

      expect(next.isOnline(other, true)).toBe(false);
      expect(next.isOnline(me, true)).toBe(true);
    });
  });

  describe("Room events", () => {
    it("lists a new room, and reloads the list for a direct one to learn who it is with", () => {
      const { chat } = ChatMother.withRooms();
      const group = RoomMother.listed({ unreadCount: 0 });
      const direct = RoomMother.listed({ kind: "dm", name: null, unreadCount: 0 });

      expect(chat.apply({ type: "room.added", room: group })).toMatchObject({ effects: [] });
      expect(chat.apply({ type: "room.added", room: direct }).effects).toEqual([{ type: "reloadRooms" }]);
      expect(chat.apply({ type: "room.added", room: group }).chat.getRooms()?.find(group.getId())).not.toBeNull();
    });

    it("closes a removed room that was open and forgets its messages", () => {
      const { chat, busy } = ChatMother.withRooms();
      const open = chat.opened(busy).olderPageLoaded(busy, ChatMother.page(ChatMother.messageIn(busy)), 50);

      const next = open.apply({ type: "room.removed", roomId: busy }).chat;

      expect(next.getOpenRoomId()).toBeNull();
      expect(next.historyOf(busy)).toBeNull();
      expect(next.getRooms()?.find(busy)).toBeNull();
    });

    it("keeps the open room's members current", () => {
      const { chat, busy } = ChatMother.withRooms();
      const room = Room.fromPrimitive(RoomMother.createPrimitive({ id: busy.toPrimitive() }));
      const newcomer = RoomMember.fromPrimitive(RoomMother.memberPrimitive());
      const open = chat.opened(busy).openRoomLoaded(room);

      const joined = open.apply({ type: "member.joined", roomId: busy, member: newcomer }).chat;
      const left = joined.apply({ type: "member.left", roomId: busy, userId: newcomer.getUserId() }).chat;

      expect(joined.getOpenRoom()?.getMembers().count()).toBe(2);
      expect(left.getOpenRoom()?.getMembers().count()).toBe(1);
      expect(chat.apply({ type: "member.left", roomId: busy, userId: UserId.fromPrimitive(crypto.randomUUID()) }).chat.getOpenRoom()).toBeNull();
    });
  });

  describe("Muting and seen marks", () => {
    it("records a room's mute, and its end", () => {
      const { chat, quiet } = ChatMother.withRooms();
      const until = new Date(Date.now() + 60_000);

      const muted = chat.roomMuted(quiet, until);

      expect(muted.getRooms()?.find(quiet)?.isMutedAt(new Date())).toBe(true);
      expect(muted.roomMuted(quiet, null).getRooms()?.find(quiet)?.isMutedAt(new Date())).toBe(false);
    });

    it("shows which of the user's messages the other member of a direct room has seen", () => {
      const { room, me: mine, other: peer } = RoomMother.direct();
      const roomId = room.getId();
      const [first, reply, second] = [ChatMother.messageIn(roomId, mine), ChatMother.messageIn(roomId, peer), ChatMother.messageIn(roomId, mine)];
      const chat = Chat.start(mine).connectionChanged("open").opened(roomId).openRoomLoaded(room).olderPageLoaded(roomId, ChatMother.page(first, reply, second), 50);

      const { chat: seen } = chat.apply({ type: "message.read", roomId, userId: peer, messageId: reply.getId() });

      expect(chat.lastSeenMessageIn(roomId)).toBeNull();
      expect(seen.lastSeenMessageIn(roomId)?.equals(first.getId())).toBe(true);
      expect(seen.apply({ type: "message.read", roomId, userId: peer, messageId: second.getId() }).chat.lastSeenMessageIn(roomId)?.equals(second.getId())).toBe(true);
    });
  });

  describe("Outbox", () => {
    it("shows a message being sent in its room until the backend confirms it", () => {
      const { chat, busy, quiet } = ChatMother.withRooms();
      const draft = MessageMother.draft({ roomId: busy.toPrimitive() });

      const sending = chat.messageSending(draft);

      expect(sending.outgoingIn(busy).count()).toBe(1);
      expect(sending.outgoingIn(quiet).isEmpty()).toBe(true);
      expect(sending.messageSent(draft.getClientMessageId()).outgoingIn(busy).isEmpty()).toBe(true);
      expect(chat.outgoingIn(busy).isEmpty()).toBe(true);
    });

    it("keeps a message that wasn't sent to try it again with the same draft, until discarded", () => {
      const { chat, busy } = ChatMother.withRooms();
      const draft = MessageMother.draft({ roomId: busy.toPrimitive() });
      const id = draft.getClientMessageId();

      const notSent = chat.messageSending(draft).messageNotSent(id);
      const retrying = notSent.messageSending(notSent.findOutgoing(id)!.getDraft());

      expect(notSent.undelivered().map((message) => message.getId())).toEqual([id]);
      expect(retrying.undelivered().isEmpty()).toBe(true);
      expect(retrying.outgoingIn(busy).count()).toBe(1);
      expect(notSent.messageDiscarded(id).findOutgoing(id)).toBeNull();
    });

    it("forgets what was on its way to a room the user left", () => {
      const { chat, busy } = ChatMother.withRooms();
      const draft = MessageMother.draft({ roomId: busy.toPrimitive() });

      const { chat: left } = chat.messageSending(draft).apply({ type: "room.removed", roomId: busy });

      expect(left.findOutgoing(draft.getClientMessageId())).toBeNull();
    });
  });
});
