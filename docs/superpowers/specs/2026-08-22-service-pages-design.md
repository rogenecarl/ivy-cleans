# Seven service pages on one template

**Date:** 2026-08-22
**Status:** Design, awaiting review
**Extends:** `2026-08-08-multi-tenant-dynamic-site-design.md`

## 1. Problem

The site has two service pages, `/deep-cleaning-{citySlug}` and
`/{citySlug}-move-out-cleaning-services`. The client wants seven, on a flat URL
pattern with no city in the path, and every new page structured like the
existing deep-cleaning page.

The client's instruction, verbatim:

> "For the new services pages you are building for now, just build the template
> - make sure it looks the same in terms of structure as the other service
> pages. Don't worry about the content. If you want content, you can search
> those service pages on Google and see what the search results are."

So: structure is the deliverable, copy is placeholder-grade and expected to be
rewritten without touching structure.

## 2. The services

| service_id | Display name | Slug |
|---|---|---|
| `standard_cleaning` | Standard Cleaning | `/services/standard-cleaning` |
| `deep_cleaning` | Deep Cleaning | `/services/deep-cleaning` |
| `move_in_out_cleaning` | Move In / Move Out Cleaning | `/services/move-in-move-out-cleaning` |
| `apartment_cleaning` | Apartment & Condo Cleaning | `/services/apartment-cleaning` |
| `airbnb_cleaning` | Airbnb & Short-Term Rental Cleaning | `/services/airbnb-cleaning` |
| `post_construction_cleaning` | Post-Construction & Renovation Cleaning | `/services/post-construction-cleaning` |
| `pre_listing_cleaning` | Real Estate & Pre-Listing Cleaning | `/services/pre-listing-cleaning` |

## 3. Decisions

| # | Decision | Note |
|---|---|---|
| D1 | The deep-cleaning page's five-section shape is the template | It is the structure the client pasted as the example, and the fuller of the two |
| D2 | Deep cleaning migrates onto the template; move-out does NOT | See §4.2 — this is the design's main risk control |
| D3 | All seven live under `/services/<slug>` | No city in the path; the domain already carries the city |
| D4 | No trailing slash | User-approved. Next's default here; `trailingSlash: true` would change every URL on the site, not just these |
| D5 | Permanent redirects from the two old slugs | User-approved. Those URLs are indexed and linked |
| D6 | New services use STATIC templated copy only, no AI slots | See §4.4 |
| D7 | Copy is written by me, service-appropriate, placeholder-grade | Per the client instruction above |

### Non-goals

- Rewriting move-out's layout to match the template.
- Per-city AI generation for the five new services.
- Changing the suburb pages, which share the `[serviceSlug]` route.
- Any change to the public site's existing appearance beyond the two migrated
  URLs.

## 4. Architecture

### 4.1 The template

`src/components/deep-cleaning/{DeepHero,WhatIs,Benefits,DeepServices,WhyChoose}.tsx`
become a generic service template under `src/components/service/`, driven by
one data shape. The five sections, and what each needs, mirror the existing
`deepCleaningData` contract exactly:

```ts
export type ServiceQuality = {
  title: string; text: string; icon: string; width: number; height: number
}

export type ServiceContent = {
  meta: { title: string; description: string }
  hero: { h1: string; paragraphs: string[] }
  whatIs: { h2: string; text: string; image: string }
  benefitsBgImage: string
  benefits: {
    h2: string; intro: string[]; listIntro: string; items: string[]; outro: string
  }
  services: {
    h2: string; image: string; listIntro: string; items: string[]
    note: string; contact: string
  }
  servicesLinkHref: string
  servicesLinkedItemIndex: number
  whyChoose: {
    h2: string; paragraphs: string[]; listIntro: string
    qualities: ServiceQuality[]; closing: string; contact: string
  }
}
```

This is `DeepCleaningData` renamed field-for-field — `deepMeta` to `meta`,
`deepHero` to `hero`, `deepServices` to `services`, `DeepQuality` to
`ServiceQuality`. Keeping the shape identical rather than "improving" it while
extracting is deliberate: it makes the byte-identical check in §4.2 a test of
the extraction alone, with no second variable.

`servicesLinkHref` and `servicesLinkedItemIndex` exist because the live
deep-cleaning page turns one list item into a link. Preserved rather than
dropped, since dropping it would change that page's markup.

Each service supplies one `ServiceContent` builder taking `CityContent`, exactly
as `deepCleaningData(c)` does today. The template is layout only; every string
comes from the builder.

### 4.2 Deep cleaning migrates onto the template, and that is the proof

The template is extracted FROM the deep-cleaning components, so deep cleaning
must render through it **byte-identically to today**. That is the acceptance
test for the template itself: if a single class, element or whitespace differs,
the extraction was lossy and the five new pages inherit the loss.

This is worth more than inspecting five new pages by eye, because the existing
page has a known-correct rendering to diff against and the new ones do not.

**Move-out does NOT migrate.** Its five sections are genuinely different
(`MoveHero / WhyMoveOut / IncludedServices / WhyIvy / Cost`), and forcing it onto
the template would change how a page that is live today looks. Nobody asked for
that. Its URL moves; its markup does not.

### 4.3 Routing

A new `src/app/(sites)/[city]/(inner)/services/[serviceSlug]/page.tsx` resolves
a slug against the seven-service registry and 404s otherwise. Static segments
still win over the existing `[serviceSlug]` catch-all, so suburb pages are
unaffected.

`generateStaticParams` emits all seven per live city. `dynamicParams` stays
true so a draft city's preview renders on demand at
`/<draftCity>/services/<slug>`, matching how the current service pages preview.

**Redirects.** The existing `[serviceSlug]` route already resolves
`deep-cleaning-{citySlug}` and `{citySlug}-move-out-cleaning-services`. Those
two branches stop rendering a page and issue a permanent redirect to the new
path instead, built through `cityHref()` so a draft city redirects inside its
own preview tree rather than escaping to the default tenant. Suburb slugs in
that route are untouched.

### 4.4 Content, and why the new services get no AI slot

The existing deep page's `whatIs.text` is `s(c, 'deep.whatIs')` — an AI-class
slot filled per city by the generation pipeline. The five new services get
**static templated copy** instead:

- The client asked for a template, not content.
- Adding five AI slots per city means five more writer-schema entries, five more
  generation calls, and real API spend on every new city, for copy that is
  explicitly placeholder.
- Static copy costs nothing per city and stays correct as cities are added.

Deep cleaning keeps its existing AI slot when it migrates, so no city loses
generated copy it already has.

Copy follows the deep-cleaning shape with `{city}` in the same slots: an H1 of
`"<Service> {city}"`, a static "What is …?" definition, a
`"Benefits of <Service> {city}"` section, a `"<Service> Services {city}"` list,
and a `"Why Choose Ivy Cleans for <Service> {city}?"` section with the same four
qualities. Static template, dynamic city — the pattern the whole site already
uses.

### 4.5 Links

Two places build service hrefs from the old templates and must move to the new
paths:

- `src/data/site.ts` — the inner nav's two service entries
- `src/app/(sites)/[city]/(inner)/home/page.tsx` — `deepHref` and `moveOutHref`

Both already wrap in `cityHref()`; only the path template changes. Whether the
nav should list all seven services rather than two is a client question, not a
technical one, and is deliberately out of scope: this design changes where the
existing two links point and adds no new nav entries.

## 5. Verification

- **Deep cleaning renders byte-identically** through the template, diffed
  against a pre-change capture. Non-negotiable; the template is wrong otherwise.
- **The crawler reports EQUIVALENT** on every public route except the two whose
  URLs deliberately moved.
- **Both old URLs return a permanent redirect** to their new paths, for a live
  city and for a draft city's preview.
- **All seven pages render** for a live city and for a draft city preview.
- Suburb pages still resolve through the old `[serviceSlug]` route.
- 338 tests, tsc, lint, build, and the admin E2E at 42/42.

## 6. Open items

1. **The nav still lists two services, not seven.** Out of scope by §4.5, but
   the client will notice. Needs his call on whether the header lists all seven,
   groups them under a dropdown, or keeps two.
2. **Copy is placeholder-grade by instruction.** It should be reviewed before
   these pages are advertised, and rewritten in the data files without touching
   the template.
3. **Images.** The template's section images come from the deep-cleaning page's
   assets. The five new services reuse them until real photography exists;
   nothing in the design depends on which file a section points at.
4. **`/services` itself has no index page.** Visiting it 404s. Whether it should
   list the seven is a follow-up.
