import type { HubUser } from "./hub-user.js";

/**
 * The part of a request the package uses. Not Fastify's type: the package
 * works with any Nest platform, and needs only the headers and a place for
 * the user that AccessTokenGuard verified.
 */
export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: HubUser;
}
