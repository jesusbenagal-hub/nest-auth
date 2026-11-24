import { z } from "zod";

import { AppRole } from "./app-role.js";

/** Who is calling, as the access token says: what a guarded route gets. */
export interface HubUser {
  id: string;
  email: string;
  name: string | null;
  isHubAdmin: boolean;
  /** The user's role in each app they can use (appId → role). */
  apps: Record<string, AppRole>;
}

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
