import { AvatarUrl, type AvatarUrlPrimitive } from "../../user/domain/AvatarUrl.ts";
import { DisplayName, type DisplayNamePrimitive } from "../../user/domain/DisplayName.ts";
import { UserId, type UserIdPrimitive } from "../../user/domain/UserId.ts";

export interface RoomPeerPrimitive {
  readonly id: UserIdPrimitive;
  readonly displayName: DisplayNamePrimitive;
  readonly avatarUrl: AvatarUrlPrimitive | null;
}

/** The other user of a direct room, who gives it its title. */
export class RoomPeer {
  private constructor(
    private readonly id: UserId,
    private readonly displayName: DisplayName,
    private readonly avatarUrl: AvatarUrl | null,
  ) {}

  static create(id: UserId, displayName: DisplayName, avatarUrl: AvatarUrl | null): RoomPeer {
    return new RoomPeer(id, displayName, avatarUrl);
  }

  static fromPrimitive(data: RoomPeerPrimitive): RoomPeer {
    return RoomPeer.create(
      UserId.fromPrimitive(data.id),
      DisplayName.fromPrimitive(data.displayName),
      data.avatarUrl === null ? null : AvatarUrl.fromPrimitive(data.avatarUrl),
    );
  }

  getId(): UserId {
    return this.id;
  }

  getDisplayName(): DisplayName {
    return this.displayName;
  }

  equals(other: RoomPeer): boolean {
    return this.id.equals(other.id);
  }

  toPrimitive(): RoomPeerPrimitive {
    return { id: this.id.toPrimitive(), displayName: this.displayName.toPrimitive(), avatarUrl: this.avatarUrl?.toPrimitive() ?? null };
  }
}
