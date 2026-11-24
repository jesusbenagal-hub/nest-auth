import { Global, Module } from "@nestjs/common";

import {
  ConfigurableNestAuthModule,
  NEST_AUTH_OPTIONS,
} from "./nest-auth.module-definition.js";

/**
 * Imported once, in the AppModule of each API:
 * `NestAuthModule.forRoot({ issuer, jwks })`, or `forRootAsync` when the
 * options come from another provider (ConfigService, SigningKeyService).
 *
 * Global, because AccessTokenGuard is used from the controllers of every
 * module, and Nest resolves its dependencies (the options) there.
 */
@Global()
@Module({ exports: [NEST_AUTH_OPTIONS] })
export class NestAuthModule extends ConfigurableNestAuthModule {}
