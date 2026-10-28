import { S3AttachmentRepository, type BucketFetch } from "../../attachment/infrastructure/S3AttachmentRepository.ts";
import { apiHttp } from "../../shared/application/factory.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { HttpAccountRepository } from "../infrastructure/HttpAccountRepository.ts";
import { HttpSessionRepository } from "../infrastructure/HttpSessionRepository.ts";
import { confirmEmailVerification } from "./confirmEmailVerification.ts";
import { requestEmailVerification } from "./requestEmailVerification.ts";
import { requestPasswordReset } from "./requestPasswordReset.ts";
import { resetPassword } from "./resetPassword.ts";
import { restoreSession } from "./restoreSession.ts";
import { signIn } from "./signIn.ts";
import { signOut } from "./signOut.ts";
import { signUp } from "./signUp.ts";
import { updateProfile } from "./updateProfile.ts";
import { watchSessionExpiry } from "./watchSessionExpiry.ts";

export const sessionModule = (http: ApiHttp, bucketFetch?: BucketFetch) => {
  const sessionRepository = new HttpSessionRepository(http);
  const accountRepository = new HttpAccountRepository(http);
  const attachmentRepository = new S3AttachmentRepository(http, bucketFetch);

  return {
    signIn: signIn({ sessionRepository }),
    signUp: signUp({ sessionRepository }),
    restoreSession: restoreSession({ sessionRepository }),
    signOut: signOut({ sessionRepository }),
    watchSessionExpiry: watchSessionExpiry({ sessionRepository }),
    updateProfile: updateProfile({ accountRepository, attachmentRepository }),
    confirmEmailVerification: confirmEmailVerification({ accountRepository }),
    requestEmailVerification: requestEmailVerification({ accountRepository }),
    requestPasswordReset: requestPasswordReset({ accountRepository }),
    resetPassword: resetPassword({ accountRepository }),
  };
};

export type SessionModule = ReturnType<typeof sessionModule>;

export const session = sessionModule(apiHttp);
