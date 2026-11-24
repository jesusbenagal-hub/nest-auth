import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  type JWTVerifyGetKey,
  jwtVerify,
} from "jose";

import { type HubUser, toHubUser } from "./hub-user.js";
import {
  NEST_AUTH_OPTIONS,
  type NestAuthModuleOptions,
} from "./nest-auth.module-definition.js";

/**
 * The part of a request the guard uses. Not Fastify's type: the package
 * works with any Nest platform, and needs only the header and a place for
 * the user.
 */
export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: HubUser;
}

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
 * in `request.user`. The browser sends the token in the hub_at cookie; the
 * hub's proxy turns it into this header, the same for every API.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly issuer: string;
  // A remote set downloads the JWKS on first use, caches it and fetches it
  // again only for a key id (kid) it doesn't know: a new signing key.
  private readonly keySet: JWTVerifyGetKey;

  constructor(@Inject(NEST_AUTH_OPTIONS) options: NestAuthModuleOptions) {
    this.issuer = options.issuer;
    this.keySet =
      options.jwks instanceof URL
        ? createRemoteJWKSet(options.jwks)
        : createLocalJWKSet(options.jwks);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
