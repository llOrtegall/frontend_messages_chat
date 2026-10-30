import { config } from "../../../config.ts";
import { S3AttachmentRepository, type BucketFetch } from "../../attachment/infrastructure/S3AttachmentRepository.ts";
import { WsRealtimeRepository } from "../../realtime/infrastructure/WsRealtimeRepository.ts";
import { apiHttp } from "../../shared/application/factory.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { connectRealtime } from "./connectRealtime.ts";
import { deleteMessage } from "./deleteMessage.ts";
import { disconnectRealtime } from "./disconnectRealtime.ts";
import { editMessage } from "./editMessage.ts";
import { followRooms } from "./followRooms.ts";
import { markRoomRead } from "./markRoomRead.ts";
import { notifyTyping } from "./notifyTyping.ts";
import { sendMessage } from "./sendMessage.ts";
import { watchChatEvents } from "./watchChatEvents.ts";
import { watchConnection } from "./watchConnection.ts";

export const chatModule = (http: ApiHttp, apiUrl: string, bucketFetch?: BucketFetch) => {
  const realtimeRepository = new WsRealtimeRepository(http, apiUrl);
  const attachmentRepository = new S3AttachmentRepository(http, bucketFetch);

  return {
    connectRealtime: connectRealtime({ realtimeRepository }),
    disconnectRealtime: disconnectRealtime({ realtimeRepository }),
    followRooms: followRooms({ realtimeRepository }),
    watchChatEvents: watchChatEvents({ realtimeRepository }),
    watchConnection: watchConnection({ realtimeRepository }),
    sendMessage: sendMessage({ realtimeRepository, attachmentRepository }),
    editMessage: editMessage({ realtimeRepository }),
    deleteMessage: deleteMessage({ realtimeRepository }),
    markRoomRead: markRoomRead({ realtimeRepository }),
    notifyTyping: notifyTyping({ realtimeRepository }),
  };
};

export type ChatModule = ReturnType<typeof chatModule>;

export const chat = chatModule(apiHttp, config.apiUrl);
