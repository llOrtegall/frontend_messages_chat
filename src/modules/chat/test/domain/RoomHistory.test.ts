import { describe, expect, it } from "bun:test";
import { MessageList } from "../../../message/domain/MessageList.ts";
import * as MessageMother from "../../../message/test/helpers/MessageMother.ts";
import { RoomHistory } from "../../domain/RoomHistory.ts";

const pageOf = (count: number) => MessageList.create(Array.from({ length: count }, () => MessageMother.create()));

describe("RoomHistory", () => {
  it("keeps paging back until a page comes shorter than asked for", () => {
    const loading = RoomHistory.empty().loadingStarted();

    const full = loading.olderPageLoaded(pageOf(2), 2);
    const last = full.loadingStarted().olderPageLoaded(pageOf(1), 2);

    expect(loading.canLoadOlder()).toBe(false);
    expect(full.canLoadOlder()).toBe(true);
    expect(last.hasMore()).toBe(false);
    expect(last.getMessages().count()).toBe(3);
  });

  it("refreshes the newest page without changing how far back the user went", () => {
    const exhausted = RoomHistory.empty().olderPageLoaded(pageOf(1), 50);

    expect(exhausted.newestPageLoaded(pageOf(50)).hasMore()).toBe(false);
  });

  it("stops loading after a failure, keeping what was loaded", () => {
    const loaded = RoomHistory.empty().olderPageLoaded(pageOf(2), 50);

    const failed = loaded.loadingStarted().loadingFailed();

    expect(failed.isLoading()).toBe(false);
    expect(failed.getMessages().equals(loaded.getMessages())).toBe(true);
  });
});
