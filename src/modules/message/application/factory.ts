import { apiHttp } from "../../shared/application/factory.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { HttpMessageRepository } from "../infrastructure/HttpMessageRepository.ts";
import { listMessages } from "./listMessages.ts";

export const messageModule = (http: ApiHttp) => {
  const messageRepository = new HttpMessageRepository(http);

  return {
    listMessages: listMessages({ messageRepository }),
  };
};

export type MessageModule = ReturnType<typeof messageModule>;

export const messages = messageModule(apiHttp);
