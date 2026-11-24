import { ConfigurableModuleBuilder } from "@nestjs/common";
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

// The builder writes forRoot / forRootAsync for us, and the provider that
// holds the options under MODULE_OPTIONS_TOKEN.
export const {
  ConfigurableModuleClass: ConfigurableNestAuthModule,
  MODULE_OPTIONS_TOKEN: NEST_AUTH_OPTIONS,
} = new ConfigurableModuleBuilder<NestAuthModuleOptions>()
  .setClassMethodName("forRoot")
  .build();
