import { createServer, type Server } from "node:http";

import {
  Controller,
  Get,
  type ModuleMetadata,
  UseGuards,
} from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import {
  exportJWK,
  generateKeyPair,
  type JSONWebKeySet,
  type JWTPayload,
  SignJWT,
} from "jose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { CurrentUser } from "../decorators/current-user.decorator.js";
import { NestAuthModule } from "../nest-auth.module.js";
import type { HubUser } from "../types/hub-user.js";
import { AccessTokenGuard } from "./access-token.guard.js";

const ISSUER = "hub-auth";
const KID = "test-key";

// A route like the ones the APIs will have.
@Controller("me")
@UseGuards(AccessTokenGuard)
class MeController {
  @Get()
  getMe(@CurrentUser() user: HubUser): HubUser {
    return user;
  }
}

const claims = {
  email: "persona@example.com",
  name: "Persona",
  hub_admin: false,
  apps: { gastos: "editor" },
};

let signingKey: CryptoKey;
let jwks: JSONWebKeySet;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  signingKey = privateKey;
  jwks = {
    keys: [{ ...(await exportJWK(publicKey)), kid: KID, alg: "ES256" }],
  };
});

/** A token as auth-service signs it; each test changes what it needs. */
function signToken({
  key = signingKey,
  issuer = ISSUER,
  expiresAt = "10m",
  payload = claims,
}: {
  key?: CryptoKey;
  issuer?: string;
  expiresAt?: string;
  payload?: JWTPayload;
} = {}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", kid: KID })
    .setIssuer(issuer)
    .setSubject("user-1")
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key);
}

async function createApp(
  authModule: NonNullable<ModuleMetadata["imports"]>[number],
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [authModule],
    controllers: [MeController],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

function getMe(app: NestFastifyApplication, token?: string) {
  return app.inject({
    method: "GET",
    url: "/me",
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });
}

describe("AccessTokenGuard with a key set in memory", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createApp(NestAuthModule.forRoot({ issuer: ISSUER, jwks }));
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets a valid token through and gives the route its user", async () => {
    const response = await getMe(app, await signToken());

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "user-1",
      email: "persona@example.com",
      name: "Persona",
      isHubAdmin: false,
      apps: { gastos: "editor" },
    });
  });

  it("answers 401 without a token", async () => {
    const response = await getMe(app);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ message: "Missing access token" });
  });

  it("answers 401 to a token signed with another key", async () => {
    const { privateKey } = await generateKeyPair("ES256");

    const response = await getMe(app, await signToken({ key: privateKey }));

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ message: "Invalid access token" });
  });

  it("answers 401 to an expired token", async () => {
    const response = await getMe(
      app,
      await signToken({ expiresAt: "1 minute ago" }),
    );

    expect(response.statusCode).toBe(401);
  });

  it("answers 401 to a token from another issuer", async () => {
    const response = await getMe(app, await signToken({ issuer: "other" }));

    expect(response.statusCode).toBe(401);
  });

  it("answers 401 to a token without the hub's claims", async () => {
    const response = await getMe(app, await signToken({ payload: {} }));

    expect(response.statusCode).toBe(401);
  });
});

describe("AccessTokenGuard with the JWKS URL", () => {
  let jwksServer: Server;
  let jwksRequests = 0;
  let app: NestFastifyApplication | undefined;

  beforeAll(async () => {
    // Plays auth-service's /.well-known/jwks.json.
    jwksServer = createServer((_request, response) => {
      jwksRequests += 1;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(jwks));
    });
    await new Promise<void>((resolve) => {
      jwksServer.listen(0, "127.0.0.1", resolve);
    });
  });

  afterEach(async () => {
    await app?.close();
    jwksRequests = 0;
  });

  afterAll(() => {
    jwksServer.close();
  });

  function jwksUrl(): URL {
    const address = jwksServer.address();
    if (address === null || typeof address === "string") {
      throw new Error("The JWKS server is not listening on a port");
    }
    return new URL(`http://127.0.0.1:${address.port}/.well-known/jwks.json`);
  }

  it("downloads the keys once and reuses them", async () => {
    app = await createApp(
      NestAuthModule.forRoot({ issuer: ISSUER, jwks: jwksUrl() }),
    );

    const first = await getMe(app, await signToken());
    const second = await getMe(app, await signToken());

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(jwksRequests).toBe(1);
  });

  it("takes its options from a factory with forRootAsync", async () => {
    app = await createApp(
      NestAuthModule.forRootAsync({
        useFactory: () => ({ issuer: ISSUER, jwks: jwksUrl() }),
      }),
    );

    const response = await getMe(app, await signToken());

    expect(response.statusCode).toBe(200);
  });
});
