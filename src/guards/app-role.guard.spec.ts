import { Controller, Get } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "../../test/create-test-app.js";
import {
  createTestSigningKey,
  TEST_ISSUER,
  type TestSigningKey,
} from "../../test/create-test-signing-key.js";
import { Public } from "../decorators/public.decorator.js";
import { RequireAppRole } from "../decorators/require-app-role.decorator.js";
import { NestAuthModule } from "../nest-auth.module.js";
import { AppRole } from "../types/app-role.js";

// An API of the app "gastos": reading needs `reader`, writing `editor`, and
// the settings `admin`.
@Controller("expenses")
@RequireAppRole(AppRole.Reader)
class ExpensesController {
  @Get()
  findAll(): string {
    return "expenses";
  }

  @Get("new")
  @RequireAppRole(AppRole.Editor)
  create(): string {
    return "created";
  }

  @Get("settings")
  @RequireAppRole(AppRole.Admin)
  getSettings(): string {
    return "settings";
  }
}

// Signed in is enough: no role needed.
@Controller("profile")
class ProfileController {
  @Get()
  getProfile(): string {
    return "profile";
  }
}

// A bug: a role on a route that lets anyone in.
@Controller("broken")
class BrokenController {
  @Get()
  @Public()
  @RequireAppRole(AppRole.Reader)
  get(): string {
    return "broken";
  }
}

let key: TestSigningKey;

beforeAll(async () => {
  key = await createTestSigningKey();
});

describe("AppRoleGuard", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp(
      NestAuthModule.forRoot({
        issuer: TEST_ISSUER,
        jwks: key.jwks,
        appId: "gastos",
      }),
      [ExpensesController, ProfileController, BrokenController],
    );
  });

  afterAll(async () => {
    await app.close();
  });

  async function getAs(
    url: string,
    claims: { apps?: Record<string, string>; hub_admin?: boolean },
  ) {
    return app.inject({
      method: "GET",
      url,
      headers: { authorization: `Bearer ${await key.signToken({ claims })}` },
    });
  }

  it.each([
    ["/expenses", "reader"],
    ["/expenses", "admin"],
    ["/expenses/new", "editor"],
    ["/expenses/settings", "admin"],
  ])("lets %s through with the %s role", async (url, role) => {
    const response = await getAs(url, { apps: { gastos: role } });

    expect(response.statusCode).toBe(200);
  });

  it.each([
    ["/expenses/new", "reader"],
    ["/expenses/settings", "editor"],
  ])("answers 403 to %s with the %s role", async (url, role) => {
    const response = await getAs(url, { apps: { gastos: role } });

    expect(response.statusCode).toBe(403);
  });

  it("answers 403 to a user with a role only in another app", async () => {
    const response = await getAs("/expenses", {
      apps: { "lista-compra": "admin" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      message: "Needs the reader role in gastos",
    });
  });

  it("answers 401, not 403, without a token: authentication comes first", async () => {
    const response = await app.inject({ method: "GET", url: "/expenses" });

    expect(response.statusCode).toBe(401);
  });

  it("lets a hub admin in without a role in the app", async () => {
    const response = await getAs("/expenses/settings", { hub_admin: true });

    expect(response.statusCode).toBe(200);
  });

  it("lets any signed-in user into a route that asks for no role", async () => {
    const response = await getAs("/profile", { apps: {} });

    expect(response.statusCode).toBe(200);
  });

  it("answers 500 to a role on a @Public() route (a bug in the API)", async () => {
    const response = await app.inject({ method: "GET", url: "/broken" });

    expect(response.statusCode).toBe(500);
  });
});

describe("AppRoleGuard without an appId", () => {
  it("answers 500 to a route with a role (a bug in the API)", async () => {
    const app = await createTestApp(
      NestAuthModule.forRoot({ issuer: TEST_ISSUER, jwks: key.jwks }),
      [ExpensesController],
    );

    const response = await app.inject({
      method: "GET",
      url: "/expenses",
      headers: { authorization: `Bearer ${await key.signToken()}` },
    });
    await app.close();

    expect(response.statusCode).toBe(500);
  });
});
