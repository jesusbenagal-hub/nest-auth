import type { AppRole } from "./app-role.js";

/** Who is calling, as the access token says: what a guarded route gets. */
export interface HubUser {
  id: string;
  email: string;
  name: string | null;
  isHubAdmin: boolean;
  /** The user's role in each app they can use (appId → role). */
  apps: Record<string, AppRole>;
}
