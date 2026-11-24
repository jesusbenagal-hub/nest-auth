// The public API of @jesusbenagal-hub/nest-auth: only what is exported here
// exists for the APIs that install the package.
export { CurrentUser } from "./decorators/current-user.decorator.js";
export { Public } from "./decorators/public.decorator.js";
export { RequireAppRole } from "./decorators/require-app-role.decorator.js";
export { NestAuthModule } from "./nest-auth.module.js";
export { AppRole } from "./types/app-role.js";
export type { HubUser } from "./types/hub-user.js";
export type { NestAuthModuleOptions } from "./types/nest-auth-module-options.js";
export { satisfiesAppRole } from "./utils/satisfies-app-role.js";
export { toHubUser } from "./utils/to-hub-user.js";
