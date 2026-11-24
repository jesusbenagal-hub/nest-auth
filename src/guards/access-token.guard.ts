import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  type JWTVerifyGetKey,
  jwtVerify,
} from "jose";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { NEST_AUTH_OPTIONS } from "../nest-auth.module-definition.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type { NestAuthModuleOptions } from "../types/nest-auth-module-options.js";
import { toHubUser } from "../utils/to-hub-user.js";

/** The token of an `Authorization: Bearer <token>` header, if there is one. */
function getBearerToken(request: AuthenticatedRequest): string | undefined {
  const { authorization } = request.headers;
  if (typeof authorization !== "string") {
    return undefined;
  }
  const [scheme, token] = authorization.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}

/**
 * Lets a request through only with a valid access token, and leaves its user
 * in `request.user`. Global: every route of the API needs a token unless it
 * is @Public(). The browser sends the token in the hub_at cookie; the hub's
 * proxy turns it into this header, the same for every API.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly issuer: string;
  // A remote set downloads the JWKS on first use, caches it and fetches it
  // again only for a key id (kid) it doesn't know: a new signing key.
  private readonly keySet: JWTVerifyGetKey;

  constructor(
    private readonly reflector: Reflector,
    @Inject(NEST_AUTH_OPTIONS) options: NestAuthModuleOptions,
  ) {
    this.issuer = options.issuer;
    this.keySet =
      options.jwks instanceof URL
        ? createRemoteJWKSet(options.jwks)
        : createLocalJWKSet(options.jwks);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() on the route or on its controller.
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = getBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        issuer: this.issuer,
        algorithms: ["ES256"],
      });
      request.user = toHubUser(payload);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }
}
