# Change 2 — DataForSEO wiring

The earlier patch said keywords were "passed in by the caller" and left it there. This is the missing half.

**Files:** new `src/pipeline/keywords.ts`, new `scripts/keywords-probe.mjs`, plus edits to `stages.ts`, `.env.local.example`, and wherever the pipeline is constructed.

---

## 1 · Credentials

Get them at `app.dataforseo.com/api-access`. It is **not** an API key — it's a login and password pair sent as HTTP Basic auth.

Add to `.env.local.example`:

```bash
# Keyword volume for city generation. Basic auth, not a bearer token.
# https://app.dataforseo.com/api-access — set a spend limit on the account.
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Reuse the existing STUB_MODEL=1 to also stub keyword calls — no network, no spend.
```

Pay-as-you-go, $50 minimum deposit, no subscription. A city's whole keyword pull is a fraction of a cent; the account-level spend limit is worth setting anyway, same discipline as the note already on `ANTHROPIC_API_KEY`.

---

## 2 · Run the probe before writing any code

```bash
DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... \
  node scripts/keywords-probe.mjs "Katy" TX

# add related-keyword expansion
node scripts/keywords-probe.mjs "Houston" TX --related
```

Prints a volume table for ~20 cleaning terms, flags whether the market clears the 300/mo demand floor, and exits 1 on any auth or API failure. Costs a fraction of a cent and proves the credentials before anything touches the pipeline.

---

## 3 · The counterintuitive bit: target the whole US, not the city

`keywords.ts` defaults to `location_code: 2840` — United States — and this looks wrong the first time you read it.

The keywords already carry their geography: `deep cleaning katy tx`. Ask for that with **national** targeting and you get the volume for that exact phrase, which is the number you want. Effectively everyone typing it is in or near Katy.

Ask for the same phrase with **Katy** targeting and you get only searchers whose Google location resolved to Katy — a subset of an already-small number, and Google suppresses low counts. You get zeros for terms that have real demand, and then you delete pages that would have worked.

Override to a city or state code only for unmodified terms like `house cleaning near me`, where the searcher's own location is the only geography in play.

---

## 4 · Keep zero-volume geo terms

`selectKeywords()` keeps a zero-volume term **if it contains the city or an area name**, and drops zero-volume terms that don't.

Local long-tail is systematically under-reported. `deep cleaning cinco ranch tx` will read as zero and still convert, because Google's data is bucketed and suppresses low counts at that granularity. Filtering on volume alone would remove exactly the terms the area pages exist to serve.

This is also why the uniqueness gate scores on *research content* rather than on search volume. Volume decides build order; it never decides whether a page exists.

---

## 5 · Wiring into the research stage

`executeStage`'s `research` case, between the web-search call and the structuring call:

```ts
case 'research': {
  // ... existing web search producing `findings` ...

  await appendProgress(key, {
    stage: 'research',
    kind: 'found',
    label: 'Pulling search volume',
  })

  const seeds = buildSeeds(facts.city, facts.state)
  const metrics = await keywords.searchVolume(seeds)
  const selected = selectKeywords(metrics, [facts.city], 20)

  await appendProgress(key, {
    stage: 'research',
    kind: 'found',
    label:
      `${selected.length} search phrases · ` +
      `${metrics.reduce((s, m) => s + (m.searchVolume ?? 0), 0)} searches/mo combined`,
  })

  const structured = await client.generate({
    schema: ResearchSchema,
    key: MODEL_KEYS.researchStructure,
    system: RESEARCH_STRUCTURE_SYSTEM,
    prompt: buildResearchStructuringPrompt(findings, facts, selected),  // third arg is new
  })

  // ... normalizeResearchSlugs, applyUniquenessGate as before ...
}
```

`buildResearchStructuringPrompt` already takes the third argument in the patch, and instructs the model to copy the list through unchanged rather than re-deriving it.

### Threading the client

`runStage(client, key, stage)` becomes `runStage(client, keywords, key, stage)`, or the two get bundled:

```ts
export interface PipelineClients {
  model: ModelClient
  keywords: KeywordClient
}
```

I'd take the bundle — there will be a third provider eventually and changing the signature once is better than twice. Construct it wherever `ModelClient` is built today:

```ts
const keywords =
  process.env.STUB_MODEL === '1'
    ? new StubKeywordClient()
    : DataForSeoClient.fromEnv() ?? new StubKeywordClient()
```

**On that fallback.** `fromEnv()` returns null when credentials are absent, and falling back to the stub means generation still works without DataForSEO — with made-up volumes. That is a real tradeoff: it keeps the pipeline runnable for anyone without an account, and it can silently ship a city built on fake numbers.

If you'd rather fail loudly, drop the `?? new StubKeywordClient()` and let it throw. Given `deriveFacts` already chooses "an error message the operator can act on immediately" over a plausible guess, failing loudly is arguably more consistent with the codebase. Your call — but make it deliberately, and if you keep the fallback, surface it in the progress line so the operator knows the volumes are fake.

---

## 6 · Cache it

Keyword volume moves monthly at most. Regenerating research three times shouldn't bill three times.

Write to a sidecar next to the draft, matching the existing `content/_drafts/<key>.progress.json` pattern:

```
content/_drafts/<key>.keywords.json
{
  "fetchedAt": "2026-08-25T...",
  "locationCode": 2840,
  "metrics": [ { "keyword": "...", "searchVolume": 1300, ... } ]
}
```

Reuse it when it's under ~30 days old. `regenerateStage('research')` should **not** clear it — the point of a regenerate is usually a better research pass, not new volume data. Add an explicit refresh control in the admin if you want one.

---

## 7 · Removing part (d)

`buildResearchPrompt` in the stages patch already has part (d) removed and the parts relettered. Double-check `docs/ai-prompts.md` — it reproduces the brief verbatim for non-engineers, and it currently documents a step that no longer exists.

---

## Done when

- [ ] `node scripts/keywords-probe.mjs "Katy" TX` prints a volume table and exits 0
- [ ] `STUB_MODEL=1` generates a city with no network calls to DataForSEO
- [ ] `research.keywords` in a generated draft matches what the probe returns for that city
- [ ] The web-search brief no longer asks the model for search phrases
- [ ] Re-running research twice inside 30 days makes one billed call, not two
- [ ] `docs/ai-prompts.md` matches the code
