/**
 * What someone can do in one app. Each role includes the ones below it:
 * an `admin` can do everything an `editor` can, and an `editor` everything
 * a `reader` can (see satisfiesAppRole). The values are the ones
 * auth-service writes in the token.
 */
export const AppRole = {
  Admin: "admin",
  Editor: "editor",
  Reader: "reader",
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];
