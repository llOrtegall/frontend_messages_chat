import { config } from "../../../config.ts";
import { ApiHttp } from "../infrastructure/ApiHttp.ts";

/** The one connection to the API: every module shares its access token. */
export const apiHttp = new ApiHttp(config.apiUrl);
