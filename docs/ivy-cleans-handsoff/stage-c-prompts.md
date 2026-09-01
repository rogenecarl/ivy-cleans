# Stage C — Page Content Prompts

Four page types. One shared contract. The differentiation rule is the important part.

---

## The rule that prevents Minneapolis happening again

Four page types can all plausibly discuss "deep cleaning in Katy." If they do, they cannibalize, and Google picks none of them — which is why `/deep-cleaning-minneapolis/` currently ranks fifth among the nine pages competing for its own topic.

Each page type owns one thing and is forbidden the others:

| Page type | Owns | Explicitly must NOT |
|---|---|---|
| **Metro homepage** | Brand, breadth, trust, coverage | Explain any service in depth. Discuss any single suburb. |
| **Service pillar** | The service — completely and canonically | Discuss individual suburbs. |
| **City page** | The suburb — completely | Explain what any service involves. |
| **Service-in-city** | **The intersection only** | Re-explain the service. Re-describe the suburb generally. |

The service-in-city page is where this goes wrong. Writing "here's what a deep clean is, and we serve Katy" duplicates both parents and deserves to rank below both. Its entire job is: **what changes about this service because of this place.**

Katy is master-planned, built 2000+, 2,400–3,400 sq ft, tile and LVP throughout, ongoing construction next door. Bellaire is 1940s bungalows, smaller, hardwood, mature trees. A deep clean in those two homes is genuinely different work — different time, different price, different problems. *That* is the page.

---

## Shared contract — prepend to all four

```
TASK
Write the body copy for one page of a local service website.

INPUTS (authoritative — do not infer, extend, or invent)
  route      one object from routes.json
  service    one entry from services.json (null for city pages and homepage)
  research   the metro + suburb entity pack for this market
  brand      voice spec, NAP, licensing, guarantees, review data

OUTPUT
  MDX body only. Start at the H1. No frontmatter — it is assembled downstream.
  Headings: one H1, then H2/H3. No H4 or deeper.

SOURCING RULE
  Every factual claim must trace to `research` or `brand`.
  If a fact is not in the inputs, you do not have it. Write around the gap;
  never fill it with something plausible.

DO NOT
  - Write JSON-LD or any schema markup. It is emitted from structured data.
  - Choose internal link targets. The link graph is computed; you receive it.
  - State any license number, insurance figure, review count, star rating,
    years in business, staff count, or price that is not in `brand`.
  - Claim awards, certifications, or press coverage.
  - Reference basements, snow, or road salt unless research.housing_stock
    and research.environmental_conditions support it.
  - Self-assess, score, or comment on the output.

BANNED PHRASINGS
  These are the tells that mark local service copy as machine-written.
  Do not use them or close variants:
    "nestled in the heart of"          "whether you're a busy professional"
    "we understand that every home"    "look no further"
    "in today's fast-paced world"      "hustle and bustle"
    "vibrant community"                "we've got you covered"
    "trusted partner"                  "when it comes to"
    "at the end of the day"            "peace of mind" (max once per page)
  Do not open the page with the city name followed by a comma.
  Do not open a section with a rhetorical question.

STYLE
  Follow `brand.voice` exactly. Warm, plain, direct.
  Short paragraphs — three sentences maximum.
  Second person. Active voice.
  Target Flesch Reading Ease 60–80.
  No em-dash-heavy sentence stacking. No sentence fragments for emphasis.
  Word count within `service.word_count` (or route.word_count).
```

---

## 1 · Metro homepage

**Route:** `/` · **Targets:** `house cleaning {metro}` · **Words:** 1,200–1,600

```
PAGE TYPE: Metro homepage.
You own brand, breadth, trust, and coverage. You do not explain services in
depth — each service has its own page. You do not describe any single suburb.

SECTIONS
  H1                    {service-neutral headline naming the metro}
  Opening               2 short paragraphs. Who you are, what you do, where.
                        Ground it in one concrete metro-level condition from
                        research.metro_profile.environmental_conditions.
  What we clean         One short paragraph per service in scope. 2–3 sentences
                        each. Enough to identify the right one, not to explain it.
  Where we work         Name the metro and the suburbs in scope. Real names only.
  Why {metro} homes      2–3 paragraphs on the metro's actual cleaning reality —
  are different          humidity, hard water, pollen season, slab foundations,
                        year-round A/C. This is the section that proves you work
                        here rather than franchise into here.
  How it works          Three steps. Booking through completion.
  Trust                 Only what is in `brand`: insurance status, guarantee,
                        review data. Omit anything absent. Never approximate.
  FAQ                   4–6, from research.service_serp[*].paa_questions,
                        chosen for breadth rather than depth.
  CTA                   brand.primary_cta

ENTITY REQUIREMENT
  At least 3 distinct items from research.metro_profile, each used for what it
  means for cleaning — not as scenery.
```

---

## 2 · Service pillar

**Route:** `/services/{slug}/` · **Targets:** `{service} {metro}` · **Words:** per `services.json`

```
PAGE TYPE: Service pillar.
You own this service completely. This page is the canonical explanation on the
domain — every service-in-city page links up to it instead of repeating it.
You do not discuss individual suburbs.

SECTIONS
  H1                    service.pillar_h1 pattern
  Opening               2 paragraphs. What this service is and who needs it.
                        Lead with the problem it solves, not the service name.
  What's included       The checklist, grouped by room or task. Competitors lead
                        with this and rank on it — make it genuinely complete.
                        Use research.service_serp[service] for what page-one
                        results cover.
  How this differs      Compare against the adjacent service explicitly
  from {adjacent}       (deep vs standard, move-out vs deep). This is the
                        section that stops the two pages cannibalizing.
  How long it takes     Ranges tied to home size. Use research.housing_stock
                        for realistic square footage in this metro.
  What affects price    Factors only — square footage, condition, frequency,
                        add-ons. State an actual price only if brand.pricing
                        exists. Otherwise: how to get a quote.
  When you need it      Triggers and timing. Seasonality from
                        research.service_serp[service] trend data if present.
  In {metro}            2 paragraphs on what this service means specifically in
                        this metro's conditions. Hard water on glass shower
                        doors, humidity in grout, construction dust — whatever
                        research.metro_profile actually supports.
  FAQ                   4–8 from research.service_serp[service].paa_questions.
                        Use the questions as asked. Do not rewrite them into
                        keyword phrases.
  CTA                   service-appropriate

ENTITY REQUIREMENT
  At least 3 items from research.metro_profile, each with its cleaning
  implication made explicit.

FORBIDDEN
  Naming individual suburbs beyond the computed coverage links.
```

---

## 3 · City page

**Route:** `/{city}/` · **Targets:** `house cleaning {city} {state}` · **Words:** 1,200–1,600

```
PAGE TYPE: City page.
You own this suburb completely. You do NOT explain what any service involves —
the service pillars do that and the reader can click. If you find yourself
writing "a deep clean includes...", stop. Wrong page.

Your job is to demonstrate that you actually know this place and work in it.

SECTIONS
  H1                    "House Cleaning Services in {city}, {state_abbr}"
  Opening               2 paragraphs. That you serve this suburb, and one
                        specific thing about it that affects cleaning. Do not
                        open with the city name and a comma.
  Areas we cover        Name real subdivisions and neighborhoods from
                        research.suburbs[city].subdivisions. Minimum 3.
                        If the array is empty, this page should not exist —
                        stop and return an error rather than inventing names.
  What homes here       Housing character from research: build era, typical
  are like              size, dominant flooring, HOA prevalence. Then what each
                        means for cleaning. Two paragraphs.
  Local conditions      From research.suburbs[city].local_conditions, filtered
                        to copy_safe: true. Never mention flood risk, crime,
                        or income. Ever.
  Services available    One or two sentences per service, each linking to the
  in {city}             computed service-in-city target. Identify, don't explain.
  Getting to you        Scheduling reality: drive time from the metro core,
                        typical availability, gate or HOA access if research
                        indicates it. This section is unfakeable and it is
                        the strongest local signal on the page.
  FAQ                   3–5, specific to this suburb where possible.
  CTA                   brand.primary_cta

ENTITY REQUIREMENT
  At least 6 distinct copy_safe details from research.suburbs[city],
  of which at least 3 are named subdivisions or anchors.

FORBIDDEN
  Explaining what a service includes.
  Any detail with copy_safe: false.
  Tourism content — attractions, restaurants, things to do. You are a cleaning
  company. Naming a subdivision because that is where the homes are is local
  relevance. Writing about the mall is not.
```

---

## 4 · Service-in-city

**Route:** `/{city}/{service-slug}/` · **Targets:** `{service} {city} {state}` · **Words:** per `services.json`

```
PAGE TYPE: Service-in-city. The money page, and the one that fails most often.

The reader can reach the service pillar in one click and the city page in one
click. You are neither. Your entire job is the intersection:

    What changes about THIS SERVICE because of THIS PLACE?

Before writing, answer that in one sentence internally. If the honest answer is
"nothing," this page should not exist — return an error and say so. Do not pad
it out.

SECTIONS
  H1                    service.city_h1 pattern
  Opening               2 paragraphs stating the intersection directly. What is
                        different about this service here, and why.
  Why {service} here    The core section, and the longest. Connect
  is different          research.suburbs[city].housing_character and
                        local_conditions to this specific service.
                        Worked example — deep cleaning in Katy:
                          newer construction, so less deferred grime but more
                          construction dust from ongoing builds nearby;
                          2,400–3,400 sq ft, so a deep clean runs two crews or
                          a full day; tile and LVP throughout rather than
                          carpet, so grout is the time sink; Houston humidity
                          means shower glass and grout discolor faster than the
                          homeowner expects.
                        Bellaire — 1940s bungalows, smaller, hardwood, mature
                        trees — produces a completely different paragraph. If
                        yours would read the same for both, you have not used
                        the research.
  What this looks       Practical: crew size, duration, what you bring, access
  like in {city}        and parking realities from research.
  What it costs here    Factors specific to this suburb — square footage,
                        home age, HOA access. Prices only from brand.pricing.
  What's included       ABBREVIATED. 5–7 bullets maximum, then link to the
                        pillar for the full list. Do not reproduce the pillar's
                        checklist — that is the cannibalization.
  FAQ                   2–4, specific to this service in this place.
  CTA                   service-appropriate

ENTITY REQUIREMENT
  At least 4 distinct copy_safe details from research.suburbs[city],
  of which at least 2 must connect the suburb to THIS service specifically —
  not generic local colour.

FORBIDDEN
  Reproducing the pillar's full "what's included" checklist.
  Any paragraph that would read identically for a different suburb.
  Any paragraph that would read identically for a different service.
```

---

## Running this on Minneapolis next week

You do not have a research pack for Minneapolis, and you do not need the full one to test the prompts. Assemble a minimal `research-lite` for the four suburbs you're rewriting:

```json
{
  "metro_profile": {
    "environmental_conditions": ["...road salt and sand tracked in Nov–Apr",
                                 "...forced-air heating, winter dust",
                                 "...ice dam and snowmelt at entryways"],
    "housing_stock": {"foundation_type": "Basements standard",
                      "dominant_flooring": "Hardwood and carpet",
                      "dominant_build_era": "..."}
  },
  "suburbs": {
    "lakeville": {"subdivisions": ["..."], "anchors": ["..."],
                  "housing_character": "...", "local_conditions": [...]}
  }
}
```

Half a day of research for four suburbs, and it tests the prompt where you can actually measure the result. The Minneapolis pages are city pages, not service-in-city — so **use prompt 3** for Lakeville, Maple Grove, Eagan, and Woodbury, and **prompt 2** for `/deep-cleaning-minneapolis/` and `/minneapolis-move-out-cleaning-services/`.

The basement rule inverts here: in Minneapolis, basements are real and worth naming. In Houston they don't exist. That single line is the whole argument for `housing_stock` living in the research pack rather than the template.

---

## What the validator checks

Once these run, Stage D enforces mechanically:

- Every banned phrase → fail
- Entity count below the page type's minimum → fail
- Any `copy_safe: false` detail appearing in copy → fail
- Cosine similarity above 0.85 against the same route in another market → fail
- Similarity above 0.80 against a sibling city in the same metro → fail
- Word count outside band, title over 60 chars, Flesch outside 60–80 → fail

The similarity thresholds are starting guesses. Calibrate them once you have twenty real pages to measure against each other.
