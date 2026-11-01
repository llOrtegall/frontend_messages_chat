import { apiHttp } from "../../shared/application/factory.ts";
import type { ApiHttp } from "../../shared/infrastructure/ApiHttp.ts";
import { HttpRoomRepository } from "../infrastructure/HttpRoomRepository.ts";
import { addMember } from "./addMember.ts";
import { changeMemberRole } from "./changeMemberRole.ts";
import { createGroupRoom } from "./createGroupRoom.ts";
import { deleteRoom } from "./deleteRoom.ts";
import { findRoom } from "./findRoom.ts";
import { listRooms } from "./listRooms.ts";
import { muteRoom } from "./muteRoom.ts";
import { openDirectRoom } from "./openDirectRoom.ts";
import { removeMember } from "./removeMember.ts";
import { unmuteRoom } from "./unmuteRoom.ts";

export const roomModule = (http: ApiHttp) => {
  const roomRepository = new HttpRoomRepository(http);

  return {
    listRooms: listRooms({ roomRepository }),
    findRoom: findRoom({ roomRepository }),
    openDirectRoom: openDirectRoom({ roomRepository }),
    createGroupRoom: createGroupRoom({ roomRepository }),
    deleteRoom: deleteRoom({ roomRepository }),
    addMember: addMember({ roomRepository }),
    removeMember: removeMember({ roomRepository }),
    changeMemberRole: changeMemberRole({ roomRepository }),
    muteRoom: muteRoom({ roomRepository }),
    unmuteRoom: unmuteRoom({ roomRepository }),
  };
};

export type RoomModule = ReturnType<typeof roomModule>;

export const rooms = roomModule(apiHttp);
