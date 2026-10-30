// The pipeline stages and their prompts. Each stage is resumable via the draft sidecar; the ModelClient seam is the only way out.

// STAGES/STAGE_IDS/stageSlots live in src/server/content/slots.ts (drafts.ts needs them; importing from here would cycle). Re-exported.
// BANNED_PHRASES lives in src/server/content/quality.ts for the same cycle reason
export { BANNED_PHRASES } from '@/server/content/quality'
export { SERVICE_LOCAL_SLUGS, STAGES, STAGE_IDS, serviceSlots, stageSlots, suburbSlots, type StageId } from '@/server/content/slots'
export * from './prompts'
export * from './research'
export * from './run'
export { CITY_ITEM, pendingVerifyItems } from './verify'
export { pendingResearchItems } from './research-steps'
