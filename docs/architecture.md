# Architecture

One Next.js app, three layers. Each folder has one job; an import that crosses a layer the wrong way fails lint.

```
src/app/      routes only — pages, layouts, actions.ts, route handlers
src/site/     the microsites' frontend — components and copy, no database
src/server/   the backend — pipeline, content, leads, blog, auth, infra
```

`src/components/ui/` (shadcn) and `src/lib/utils.ts` (`cn()`) stay where the shadcn CLI expects them.

## Import rules

Enforced by `no-restricted-imports` in `eslint.config.mjs`:

| From | May import | May not import |
|---|---|---|
| `src/app/` | anything | — (but holds no business logic) |
| `src/site/` | `src/server` modules, `src/components/ui`, server actions in `src/app` | `@/server/infra/*`, `@/generated/*`, `@prisma/*` |
| `src/server/` | other `src/server` modules, `src/site/data` (plain data) | `react`, `next/*`, `@/app/*`, `@/site/components/*`, `@/components/*` |
| `src/server/auth/` | as `src/server`, plus `next/*` and `react` | — |

Cross-folder imports use `@/…` (and `@content/…` for the JSON indexes in `content/`). Same-folder imports use `./…`.

## Where new code goes

| You are adding | Put it in |
|---|---|
| A public page | `src/app/(sites)/[city]/(inner)/<page>/page.tsx`; its sections in `src/site/components/<page>/`; its copy in `src/site/data/<page>.ts`; link it from `src/site/data/link-graph.ts` |
| A console screen | `src/app/admin/(console)/<screen>/` with `page.tsx`, `actions.ts`, and the screen's own components; the section in `src/server/auth/access.ts` |
| A console action | the screen's `actions.ts`: `'use server'`, then `requireAdmin()` or `requireSession()` as the first line, then one call into `src/server/pipeline/admin-logic/` |
| Console logic | `src/server/pipeline/admin-logic/<screen>.ts`, exported through its `index.ts` |
| A UI piece several console screens share | `src/app/admin/_components/` |
| A pipeline prompt | `src/server/pipeline/stages/prompts.ts`; update `docs/ai-prompts.md` and run the evals |
| A database model | `prisma/schema.prisma`, then a `store.ts` in its `src/server/<domain>/` folder — the only file there that imports Prisma |
| A script | `scripts/checks/` (CI-style, exits 1 on failure), `scripts/ops/` (operator tasks), or `scripts/dev/` (developer tooling) |
| A test | `tests/unit/<area>/` mirroring the source folder; `tests/integration/` if it touches a real service |
