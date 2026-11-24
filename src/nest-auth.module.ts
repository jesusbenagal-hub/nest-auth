import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AccessTokenGuard } from "./guards/access-token.guard.js";
import { AppRoleGuard } from "./guards/app-role.guard.js";
import { ConfigurableNestAuthModule } from "./nest-auth.module-definition.js";

/**
 * Imported once, in the AppModule of each API:
 * `NestAuthModule.forRoot({ issuer, jwks, appId })`, or `forRootAsync` when
 * the options come from another provider (ConfigService, SigningKeyService).
 *
 * It protects every route of the API: its guards are global (APP_GUARD), so
 * a route nobody marked is closed, not open. Nest runs them in this order.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: AppRoleGuard },
  ],
})
export class NestAuthModule extends ConfigurableNestAuthModule {}
