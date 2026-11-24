import { SetMetadata } from "@nestjs/common";

/** Where @Public() leaves its mark; AccessTokenGuard reads it. */
export const IS_PUBLIC_KEY = "nest-auth:isPublic";

/**
 * Opens a route (or a whole controller) to requests without an access
 * token: every other route needs one, because the guard is global.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
