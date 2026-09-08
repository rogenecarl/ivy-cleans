# Orlando build — engineering feedback

Reviewed `ivycleans.vercel.app/orlando` — homepage, `/home`, `/contact`, three area pages, two service pages, `robots.txt`, `sitemap.xml`. Every item below has a file location from the repo.

**Short version:** the generated content is excellent and the pipeline changes worked. What's holding the site back is the template *around* the generated content — hardcoded Minneapolis values, placeholders, and missing technical basics. All of it ships to every future city unless fixed now.

---

## What landed — no action, just credit

- **Area pages are genuinely local.** Lake Mary names Heathrow, Timacuan, Magnolia Plantation, Steeplechase, Griffin Farm, The Forest — and knows Heathrow needs gate authorization. Windermere names Isleworth, Keene's Pointe, Lake Butler Sound, Waterstone — and knows about marble, dock grit, blind mosquitoes. Side by side they read as two different places. Changes 1 and 3 are working.
- **Voice rewrite landed.** Hero and services intro are specific — terrazzo, screened lanais, lovebugs, irrigation spray. Duplication check against Houston/Miami/Minneapolis: hero paragraphs 1–2 and all five intro paragraphs are clean.
- **Airbnb page has a real Orlando section** — five-bedroom homes near the parks, pool water in chalky rings. Content-strategy section C, already built.
- **Changes 6 and 7 landed** — no ZIP/landmark sentences; slugs are `/orlando/lake-mary`.

---

## Blockers — before this goes on a domain

### 1 · Two wrong phone numbers

**Symptom:** 346-644-6564 (Houston area code) on every page. `+16124825001` (Minneapolis) also appears on `/orlando/home`.

**Cause — the 612 leak is deliberate and documented:**

`src/data/site.ts:89-96`
```ts
/*
 * DELIBERATELY STILL LITERAL: the inner chrome's 612-482-5001 is a second
 * phone line distinct from the main number. Whether a new city gets one
 * number or two is an open question for the client — resolved in Plan 3's
 * admin form. Do not tokenize until then.
 */
phone: "612-482-5001",
phoneHref: "tel: +16124825001",
```

Also `src/data/book.ts:99` — `tel:6124240391` hardcoded.

**The open question is now answered: one number per city.** Tokenise both. `innerSite.phone` and `phoneHref` should come from `c.phone` / `c.phoneHref` via `t()`, same as the hero. Remove the `book.ts` literal.

**The 346 number is a data problem** — whoever created the Orlando city entered a Houston number. Add a check in `deriveFacts()` or the admin form: warn when the area code doesn't match the state. Orlando is 407 / 321 / 689. A hardcoded map of state → area codes is fine; it only needs to catch the obvious mismatch.

### 2 · "Address pending" is live

**Symptom:** `/orlando/contact` shows "Orlando — address pending."

**Cause:** placeholder pattern in the city docs — `content/houston.json:8`, `miami.json:8`, `minnesota.json:8` all carry `"address": "{City} — address pending"`. Orlando presumably the same.

**Fix:** two options, do both.
- `validate.ts` rejects any address containing "pending" for `status: 'live'`.
- Contact page and footer render the address block only when it's real; omit rather than show a placeholder.

Also blocks JSON-LD (#7) and the map embed.

### 3 · Every area page shows Minneapolis's photos

**Symptom:** `rn_image_picker_lib_temp_d129a169-21-1.jpg`, `Untitled-design.png` etc. on every area page, no alt text, two repeated.

**Cause:** `src/data/suburb.ts:108-117` — hardcoded image paths, with a comment confirming *"same on every suburb."*

**Fix:** `workInAction.images` reads from `c.photos` (new field on `CityContent`, part of the ops block in content-strategy section A). Each entry `{ path, alt }`. When absent, render the section with no images rather than the Minneapolis set — an empty gallery is better than a fingerprint across 100 sites.

Same photos on every domain is a network signal, and a photo of the actual Orlando crew is the cheapest trust signal available.

### 4 · Blog links escape the tenant

**Symptom:** Homepage blog links go to `/do-i-need-to-be-home-during-a-deep-cleaning-service` at the root, not `/orlando/…`. On the real domain they'll 404.

**Cause:** `src/data/posts.ts:3-5` — root-relative hrefs, never passed through `cityHref()`.

```ts
{ title: "...", href: "/do-i-need-to-be-home-during-a-deep-cleaning-service", ... }
```

**Fix:** `posts.ts` becomes a function of `c` (like `suburbData` already is) and wraps each href in `cityHref(c, …)`. Grep for any other root-relative `href: "/…"` in `src/data/` — same class of bug.

### 5 · No sitemap, no robots

**Symptom:** both 404.

**Cause:** `src/app/sitemap.ts` and `src/app/robots.ts` don't exist.

**Fix:** Next.js conventions — `sitemap.ts` returning the route list per tenant (home, services, every suburb slug, contact, faq, book), `robots.ts` allowing all and pointing at the sitemap. Both must be tenant-aware: on `ivycleansorlando.com` the sitemap lists Orlando's routes at that host, not `/orlando/…` paths.

A new domain with a sitemap gets 25 pages indexed in weeks. Without one, months.

### 6 · No structured data

**Cause:** no JSON-LD anywhere.

**Fix:** a `LocalBusiness` block on the homepage and `Service` on each service page — emitted in code from `c.phone`, `c.address`, `c.city`, service registry. Never model-written. Blocked on #2.

---

## Quality — soon, not launch-blocking

### 7 · The area-page frame is still template, identical on every page

The generated slots are excellent. Around them, `src/data/suburb.ts` still renders the old Savage copy verbatim on every area:

- The bulleted benefits list (*"Reducing the number of allergens…"*)
- *"At Ivy Cleans, we use eco-friendly cleaning products and techniques…"*
- *"We understand that every home in {suburb} is unique, which is why we offer customized cleaning services to meet your specific needs."*

That closing line is on the banned-phrasings list. All three are byte-identical on Lake Mary, Windermere and Maitland.

**Fix:** cut the benefits list and the closing line entirely — the generated `local` paragraph already covers what they say, better. Keep the eco line only if it's a real differentiator; otherwise cut.

### 8 · Hero paragraph 3 leaks across cities

`"or workplace? Is there a cleaning project sitting on your list"` — 63–70 characters shared with Houston and Miami.

**Cause:** `src/pipeline/stages.ts:269` — *"Three short questions to the reader, one sentence each… the 'do you have a mess that needs cleaning?' beat."* Three short questions converge on the exemplar every time.

**Fix:** replace the example with a spec: *"Three questions a homeowner here might actually be asking — about their own house, their schedule, or a specific room. Do not reuse the example's questions."* Or drop paragraph 3; it's the weakest paragraph on the page.

### 9 · Meta descriptions

**Homepage** — `src/data/home.ts:29` still carries the old Minneapolis hero: *"As a local and insured business, Ivy Cleans is thrilled to be providing cleaning…"* — under a page whose hero was rewritten. Generate it from `heroParagraphs[0]`, first 155 characters.

**Area pages** — `src/data/suburb.ts:45`: *"Choose Ivy Cleans for superior house cleaning in {name} {ST}. Best-in-class home cleaning service awaits. Book your cleaning now!"* Identical on every area. First sentence of the generated `homes` slot, trimmed to 155, is a better snippet and costs nothing.

### 10 · Deep-cleaning "What is" paragraph is the Minneapolis original

396 characters, verbatim, on every site. Acceptable as shared canonical text — but rewrite it once in the new voice. It reads like the old copy because it is the old copy.

### 11 · CTA band is an H2, five times

`src/components/CtaBand.tsx:63` — *"Ready For a Sparkling Clean House? Book Your Cleaning Service {city}"* is an `<h2>`, repeated five times on the homepage. Change to `<p>` with the same classes. Headings are document structure; five identical ones is noise.

### 12 · Service page titles are short

`Deep Clean Orlando` → `Deep Cleaning Services in Orlando, FL | Ivy Cleans`. Apply the title patterns from `services.json` in `generateMetadata`.

### 13 · Ten service cards, seven service pages

`src/data/packages.ts:17-26` lists Condo, Rental, Renovation, Eco-Friendly, Commercial and Maid Service as H3 cards alongside the seven that have pages. Either link each to a real page or reduce the list to the seven in `SERVICE_SLUGS`. Card text is also the old register (*"comprehensive sanitation of your residence, encompassing inaccessible regions"*) — regenerate when the voice pass reaches it.

### 14 · No map embed

`/home` and `/contact` both lack one. Blocked on #2.

---

## Not built yet — expected

- **Ops block** (content-strategy section A). No "serving Orlando since," no crew lead, no local reviews. Needs the owner's input per market. Fixing #3 is the first piece of it.
- **Validators** (section D). #7 and #8 would have been caught automatically.

---

## Order

| # | Item | Effort |
|---|---|---|
| 1 | Tokenise `site.ts:95` and `book.ts:99`; add area-code check | 1 hour |
| 2 | Reject "pending" addresses in validate; hide placeholder in render | 1 hour |
| 4 | `posts.ts` through `cityHref()` + grep for siblings | 30 min |
| 5 | `sitemap.ts` + `robots.ts`, tenant-aware | 2 hours |
| 3 | `workInAction.images` from `c.photos`, empty when absent | 1 hour |
| 7 | Cut the area-page boilerplate | 30 min |
| 8 | Hero para 3 → spec | 15 min |
| 9 | Both meta descriptions from generated copy | 1 hour |
| 11 | CTA band `<h2>` → `<p>` | 10 min |
| 12–13 | Titles + service card list | 1 hour |
| 6, 14 | JSON-LD + map, once #2 has a real address | 2 hours |

About a day and a half. **Items 1–5 before generating Houston** — every one of them ships to all 100 sites otherwise.

---

## Data the owner needs to supply for Orlando

Not code. Needed before #1, #2, #3 can complete:

- An Orlando phone number (407 / 321 / 689)
- A real street address, or the decision to omit one
- Six photos of the Orlando crew or Orlando jobs, with a one-line caption each
