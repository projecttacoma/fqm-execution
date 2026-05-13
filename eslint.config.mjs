// @ts-check

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig(
  globalIgnores(["**/build", "**/connectathon", "**/coverage-percent-script"]),
  js.configs.recommended,
  eslintConfigPrettier,
  tseslint.configs.recommended,
  {
    rules: {
      "no-case-declarations": "off",
      "@typescript-eslint/no-explicit-any": "off",
    }
  }
);