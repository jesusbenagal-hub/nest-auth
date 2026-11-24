import { describe, expect, it } from "vitest";

import { AppRole } from "../types/app-role.js";
import { satisfiesAppRole } from "./satisfies-app-role.js";

describe("satisfiesAppRole", () => {
  it.each([
    [AppRole.Admin, AppRole.Admin],
    [AppRole.Admin, AppRole.Editor],
    [AppRole.Admin, AppRole.Reader],
    [AppRole.Editor, AppRole.Editor],
    [AppRole.Editor, AppRole.Reader],
    [AppRole.Reader, AppRole.Reader],
  ])("accepts %s where %s is required", (granted, required) => {
    expect(satisfiesAppRole(granted, required)).toBe(true);
  });

  it.each([
    [AppRole.Editor, AppRole.Admin],
    [AppRole.Reader, AppRole.Admin],
    [AppRole.Reader, AppRole.Editor],
  ])("rejects %s where %s is required", (granted, required) => {
    expect(satisfiesAppRole(granted, required)).toBe(false);
  });

  it("rejects a user without a role in the app", () => {
    expect(satisfiesAppRole(undefined, AppRole.Reader)).toBe(false);
  });
});
