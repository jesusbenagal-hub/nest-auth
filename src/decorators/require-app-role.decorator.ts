import { SetMetadata } from "@nestjs/common";

import type { AppRole } from "../types/app-role.js";

/** Where @RequireAppRole() leaves the role; AppRoleGuard reads it. */
export const REQUIRED_APP_ROLE_KEY = "nest-auth:requiredAppRole";

/**
 * The least role a route needs in the API's app (the `appId` of
 * NestAuthModule.forRoot): `@RequireAppRole(AppRole.Editor)` lets editors
 * and admins in. On a controller it applies to all its routes; on a route,
 * it replaces the controller's.
 */
export const RequireAppRole = (
  role: AppRole,
): MethodDecorator & ClassDecorator => SetMetadata(REQUIRED_APP_ROLE_KEY, role);
