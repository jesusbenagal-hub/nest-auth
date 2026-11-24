import type { AppRole } from "../types/app-role.js";

// The hierarchy as numbers: comparing two roles is comparing their ranks.
const APP_ROLE_RANK: Record<AppRole, number> = {
  reader: 1,
  editor: 2,
  admin: 3,
};

/**
 * Whether a granted role is enough for a required one (`editor` is enough
 * for `reader`, not for `admin`). No role at all is never enough.
 */
export function satisfiesAppRole(
  granted: AppRole | undefined,
  required: AppRole,
): boolean {
  return (
    granted !== undefined && APP_ROLE_RANK[granted] >= APP_ROLE_RANK[required]
  );
}
