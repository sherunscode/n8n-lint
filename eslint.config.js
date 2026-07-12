import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "packages/**/dist/**", "packages/core/schema/**", "docs/benchmark-zie619-report.json"]
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    },
    rules: {
      "no-console": "off"
    }
  },
  {
    files: ["packages/**/*.ts"],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowBoolean: true,
          allowNullish: true,
          allowNumber: true,
          allowRegExp: true
        }
      ]
    }
  }
);
