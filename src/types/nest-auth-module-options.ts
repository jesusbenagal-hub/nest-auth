import type { JSONWebKeySet } from "jose";

/** How an API tells NestAuthModule which tokens to accept. */
export interface NestAuthModuleOptions {
  /** The `iss` every access token must carry ("hub-auth"). */
  issuer: string;
  /**
   * The public keys that verify the tokens. An API gives the URL of
   * auth-service's JWKS, fetched on first use and cached; auth-service gives
   * its own key set, already in memory.
   */
  jwks: URL | JSONWebKeySet;
}
