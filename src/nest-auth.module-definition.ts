import { ConfigurableModuleBuilder } from "@nestjs/common";

import type { NestAuthModuleOptions } from "./types/nest-auth-module-options.js";

// The builder writes forRoot / forRootAsync for us, and the provider that
// holds the options under MODULE_OPTIONS_TOKEN.
export const {
  ConfigurableModuleClass: ConfigurableNestAuthModule,
  MODULE_OPTIONS_TOKEN: NEST_AUTH_OPTIONS,
} = new ConfigurableModuleBuilder<NestAuthModuleOptions>()
  .setClassMethodName("forRoot")
  .build();
