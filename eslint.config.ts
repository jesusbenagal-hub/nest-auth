import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import checkFile from "eslint-plugin-check-file";
import { importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

/**
 * The hub's baseConfig (hub/packages/config/src/eslint.ts), adapted to Nest:
 * classes with decorators, `*.spec.ts` tests and no tsconfig outside the repo.
 */
export default defineConfig(
  globalIgnores(["dist/", "coverage/"]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      // No `as` assertions (`as const` is fine).
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      // Nest modules are empty classes: the decorator is their content.
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowWithDecorator: true },
      ],
    },
  },

  // Imports: only what TypeScript doesn't already check.
  importX.flatConfigs.typescript,
  {
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-cycle": "error",
      "import-x/no-duplicates": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },

  // Names.
  {
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.ts": "KEBAB_CASE" },
        // `health.controller.ts` and `health.e2e-spec.ts` are checked as their first part.
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        { "{src,test}/**/": "KEBAB_CASE" },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"] },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        { selector: "variable", format: ["camelCase", "UPPER_CASE"] },
        // Decorators made with a factory (`createParamDecorator`) are
        // exported constants, used like `@CurrentUser()`.
        {
          selector: "variable",
          modifiers: ["const", "exported"],
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        // A parameter a signature makes us accept but we don't use (`_data`);
        // TypeScript's noUnusedParameters also skips names that start with _.
        {
          selector: "parameter",
          modifiers: ["unused"],
          format: ["camelCase"],
          leadingUnderscore: "require",
        },
        // Decorators we write (`@AppRole()`) are PascalCase functions.
        { selector: "function", format: ["camelCase", "PascalCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },
        {
          selector: ["variable", "parameter"],
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "can", "should"],
        },
        // Names that come from outside: environment variables (`DATABASE_URL`)
        // and JWT claims (`email_verified`, `hub_admin`); and the keys of an
        // `as const` object used as an enum (`AppRole.Admin`), as in the hub.
        {
          selector: ["objectLiteralProperty", "typeProperty"],
          format: ["camelCase", "UPPER_CASE", "snake_case", "PascalCase"],
        },
        {
          selector: [
            "objectLiteralProperty",
            "typeProperty",
            "objectLiteralMethod",
          ],
          modifiers: ["requiresQuotes"],
          format: null,
        },
      ],
    },
  },

  // Config files: default export (the tool requires it).
  {
    files: ["*.config.{js,ts}", "*.config.*.ts"],
    rules: { "no-restricted-exports": "off" },
  },
  {
    // Last: the .js config files are outside tsconfig.json, so no types.
    files: ["*.config.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
