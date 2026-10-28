import { uploadAttachment } from "../../attachment/application/uploadAttachment.ts";
import type { AttachmentRepository } from "../../attachment/domain/AttachmentRepository.ts";
import { DisplayName } from "../../user/domain/DisplayName.ts";
import type { AccountRepository } from "../domain/AccountRepository.ts";
import type { CurrentUser } from "../domain/CurrentUser.ts";
import { ProfileChanges } from "../domain/ProfileChanges.ts";

interface Dependencies {
  readonly accountRepository: AccountRepository;
  readonly attachmentRepository: AttachmentRepository;
}

export interface UpdateProfileInput {
  readonly displayName: string;
  /** A new picture, null to remove it, undefined to keep it. */
  readonly avatar?: Blob | null;
}

export const updateProfile = ({ accountRepository, attachmentRepository }: Dependencies) => {
  const upload = uploadAttachment({ attachmentRepository });

  return async (current: CurrentUser, { displayName, avatar }: UpdateProfileInput): Promise<CurrentUser> => {
    const name = DisplayName.create(displayName);
    const avatarKey = avatar ? await upload(avatar) : avatar;
    const changes = ProfileChanges.between(current, { displayName: name, avatarKey });
    if (changes.isEmpty()) return current;
    return accountRepository.updateProfile(changes);
  };
};
