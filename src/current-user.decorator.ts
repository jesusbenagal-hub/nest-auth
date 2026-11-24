import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { AuthenticatedRequest } from "./access-token.guard.js";
import type { HubUser } from "./hub-user.js";

/**
 * The user of a guarded route, as a parameter: `@CurrentUser() user: HubUser`.
 * Only for routes behind AccessTokenGuard, which is what puts it there.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): HubUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      // A bug, not a client error: the route forgot the guard.
      throw new Error("@CurrentUser() needs AccessTokenGuard on the route");
    }
    return user;
  },
);
