# What changed since the last package

Only these files are new or changed. Everything else you already have is unchanged.

## New
| File | What |
|---|---|
| `content-strategy.md` | The content plan beyond the seven changes — ops block, voice rewrite, service local sections, validators, evals. **Read before generating any production city.** |
| `domain-automation.md` | Task 9, final version. Autonomous domain purchase + hosting. Porkbun as registrar, Vercel as host, Global Config for routing. |
| `patches/provision.ts` | New `src/pipeline/provision.ts` — the orchestrator with Porkbun / Vercel / Global Config clients and stubs. Tested end to end against the stubs. |
| `patches/provision-wiring.md` | The two repo edits for task 9: `resolve-rewrite.ts` and `publishCity()`. |
| `patches/provision-probe.mjs` | Verifies all three providers' credentials + Vercel plan tier. |

## Changed
| File | What |
|---|---|
| `README.md` | Adds task 9 and `content-strategy.md` to the read order, the change table, and the done-when checklist. Replace your copy. |

## Delete if you have it
| File | Why |
|---|---|
| `patches/domain-provision.mjs` | An earlier task-9 draft that bought domains through Vercel's registrar. Superseded by `provision.ts`. If it's in your copy, delete it — it contradicts the current plan. |

## Unchanged — no action
builder-review.md · change-list.md · stage-c-prompts.md · openseo-setup.md ·
patches/schemas.ts · stages-patch.ts · similarity.ts · check-duplication.mjs ·
changes-4-and-6.md · keywords.ts · keywords-probe.mjs · change-2-wiring.md · openseo-provision.mjs
