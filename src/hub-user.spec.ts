import { describe, expect, it } from "vitest";

import { toHubUser } from "./hub-user.js";

// A payload as auth-service signs it (jose adds iss, iat and exp).
const payload = {
  iss: "hub-auth",
  sub: "019b0000-0000-7000-8000-000000000000",
  email: "persona@example.com",
  name: "Persona",
  hub_admin: false,
  apps: { "lista-compra": "admin", gastos: "reader" },
  iat: 1_700_000_000,
  exp: 1_700_000_600,
};

describe("toHubUser", () => {
  it("turns the claims into a HubUser", () => {
    expect(toHubUser(payload)).toEqual({
      id: payload.sub,
      email: "persona@example.com",
      name: "Persona",
      isHubAdmin: false,
      apps: { "lista-compra": "admin", gastos: "reader" },
    });
  });

  it("accepts a user without a name", () => {
    expect(toHubUser({ ...payload, name: null }).name).toBeNull();
  });

  it.each(["sub", "email", "hub_admin", "apps"])(
    "rejects a payload without %s",
    (claim) => {
      const incomplete = Object.fromEntries(
        Object.entries(payload).filter(([key]) => key !== claim),
      );
      expect(() => toHubUser(incomplete)).toThrow();
    },
  );

  it("rejects a role that doesn't exist", () => {
    expect(() =>
      toHubUser({ ...payload, apps: { gastos: "owner" } }),
    ).toThrow();
  });
});
