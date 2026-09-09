import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "work/**",
    "src/legacy-app/**", // Ordered classic fragments are syntax-checked as one delivered script.
    "outputs/**",
    ".openai/**",
    "supabase/functions/**",
    ".wrangler/**",
    ".wrangler-config/**",
    "node_modules/**",
    "next-env.d.ts",
    "worker-configuration.d.ts", // Generated Cloudflare runtime declarations.
  ]),
]);

export default eslintConfig;
