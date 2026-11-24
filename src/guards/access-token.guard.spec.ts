import { createServer, type Server } from "node:http";

import { Controller, Get } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "../../test/create-test-app.js";
import {
  createTestSigningKey,
  TEST_ISSUER,
  type TestSigningKey,
} from "../../test/create-test-signing-key.js";
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { Public } from "../decorators/public.decorator.js";
import { NestAuthModule } from "../nest-auth.module.js";
import type { HubUser } from "../types/hub-user.js";

// Routes like the ones an API has. None says it is protected: the guard is
// global, so they all are, but the @Public() ones.
@Controller("me")
class MeController {
  @Get()
  getMe(@CurrentUser() user: HubUser): HubUser {
    return user;
  }

  @Get("public")
  @Public()
  getPublic(): string {
    return "ok";
  }
}

@Controller("health")
@Public()
class HealthController {
  @Get()
  check(): string {
    return "ok";
  }
}

function get(app: NestFastifyApplication, url: string, token?: string) {
  return app.inject({
    method: "GET",
    url,
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });
}

let key: TestSigningKey;

beforeAll(async () => {
  key = await createTestSigningKey();
});

describe("AccessTokenGuard with a key set in memory", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp(
      NestAuthModule.forRoot({ issuer: TEST_ISSUER, jwks: key.jwks }),
      [MeController, HealthController],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("lets a valid token through and gives the route its user", async () => {
    const token = await key.signToken({
      claims: { apps: { gastos: "editor" } },
    });

    const response = await get(app, "/me", token);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "user-1",
      email: "persona@example.com",
      name: "Persona",
      isHubAdmin: false,
      apps: { gastos: "editor" },
    });
  });

  it("answers 401 without a token on a route nobody marked", async () => {
    const response = await get(app, "/me");

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ message: "Missing access token" });
  });

  it.each(["/me/public", "/health"])(
    "lets %s through without a token, because it is @Public()",
    async (url) => {
      const response = await get(app, url);

      expect(response.statusCode).toBe(200);
    },
  );

  it("answers 401 to a token signed with another key", async () => {
    const otherKey = await createTestSigningKey();

    const response = await get(app, "/me", await otherKey.signToken());

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ message: "Invalid access token" });
  });

  it("answers 401 to an expired token", async () => {
    const token = await key.signToken({ expiresAt: "1 minute ago" });

    const response = await get(app, "/me", token);

    expect(response.statusCode).toBe(401);
  });

  it("answers 401 to a token from another issuer", async () => {
    const token = await key.signToken({ issuer: "other" });

    const response = await get(app, "/me", token);

    expect(response.statusCode).toBe(401);
  });

  it("answers 401 to a token without the hub's claims", async () => {
    const token = await key.signToken({ claims: { email: undefined } });

    const response = await get(app, "/me", token);

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
      response.end(JSON.stringify(key.jwks));
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
    app = await createTestApp(
      NestAuthModule.forRoot({ issuer: TEST_ISSUER, jwks: jwksUrl() }),
      [MeController],
    );

    const first = await get(app, "/me", await key.signToken());
    const second = await get(app, "/me", await key.signToken());

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(jwksRequests).toBe(1);
  });

  it("takes its options from a factory with forRootAsync", async () => {
    app = await createTestApp(
      NestAuthModule.forRootAsync({
        useFactory: () => ({ issuer: TEST_ISSUER, jwks: jwksUrl() }),
      }),
      [MeController],
    );

    const response = await get(app, "/me", await key.signToken());

    expect(response.statusCode).toBe(200);
  });
});
