import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type { HubUser } from "../types/hub-user.js";

/**
 * The user of the request, as a parameter: `@CurrentUser() user: HubUser`.
 * AccessTokenGuard puts it there, so it exists on every route but the
 * @Public() ones.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): HubUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      // A bug, not a client error: the route is @Public().
      throw new Error("@CurrentUser() can't be used on a @Public() route");
    }
    return user;
  },
);
