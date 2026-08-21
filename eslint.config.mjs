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
    "next-env.d.ts",
    /*
     * Harness scratch, which lives INSIDE the repo: git worktrees under
     * .claude/worktrees/ and the brainstorm/SDD workspaces under
     * .superpowers/. Both are gitignored, but ESLint has no notion of
     * .gitignore, and the patterns above are anchored at the root — so a
     * worktree's own .next/ is at .claude/worktrees/<name>/.next/ and does
     * NOT match ".next/**". Without these, linting the main checkout walks
     * every build artifact of every worktree and fails on minified vendor
     * chunks that were never ours.
     */
    ".claude/**",
    ".superpowers/**",
  ]),
]);

export default eslintConfig;
