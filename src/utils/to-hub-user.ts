import { z } from "zod";

import { AppRole } from "../types/app-role.js";
import type { HubUser } from "../types/hub-user.js";

// The claims auth-service signs (§5.2 of the architecture), checked at
// runtime: a valid signature says who wrote the token, the schema says it
// has what we need.
const accessTokenClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  name: z.string().nullable(),
  hub_admin: z.boolean(),
  apps: z.record(z.string(), z.enum(AppRole)),
});

/**
 * Turns the payload of a verified access token into a HubUser. Throws if
 * the payload doesn't have the claims of the hub's tokens.
 */
export function toHubUser(payload: unknown): HubUser {
  const claims = accessTokenClaimsSchema.parse(payload);
  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name,
    isHubAdmin: claims.hub_admin,
    apps: claims.apps,
  };
}
