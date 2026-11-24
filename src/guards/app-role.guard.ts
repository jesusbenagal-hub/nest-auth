import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { REQUIRED_APP_ROLE_KEY } from "../decorators/require-app-role.decorator.js";
import { NEST_AUTH_OPTIONS } from "../nest-auth.module-definition.js";
import type { AppRole } from "../types/app-role.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type { NestAuthModuleOptions } from "../types/nest-auth-module-options.js";
import { satisfiesAppRole } from "../utils/satisfies-app-role.js";

/**
 * Lets a request through only if the user's role in this API's app is at
 * least the one @RequireAppRole() asks for. Runs after AccessTokenGuard
 * (authentication first, 401; then authorization, 403). A hub admin gets
 * in everywhere: they own the hub.
 */
@Injectable()
export class AppRoleGuard implements CanActivate {
  private readonly appId: string | undefined;

  constructor(
    private readonly reflector: Reflector,
    @Inject(NEST_AUTH_OPTIONS) options: NestAuthModuleOptions,
  ) {
    this.appId = options.appId;
  }

  canActivate(context: ExecutionContext): boolean {
    // The route's role wins over the controller's.
    const requiredRole = this.reflector.getAllAndOverride<AppRole | undefined>(
      REQUIRED_APP_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRole === undefined) {
      return true;
    }

    // Both are bugs in the API, not client errors (500).
    if (this.appId === undefined) {
      throw new Error("@RequireAppRole() needs an appId in NestAuthModule");
    }
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      throw new Error("@RequireAppRole() can't be used on a @Public() route");
    }

    if (
      user.isHubAdmin ||
      satisfiesAppRole(user.apps[this.appId], requiredRole)
    ) {
      return true;
    }
    throw new ForbiddenException(
      `Needs the ${requiredRole} role in ${this.appId}`,
    );
  }
}
