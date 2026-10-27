#!/usr/bin/env node
/*
 * scripts/openseo-provision.mjs
 *
 * Bulk-provisions OpenSEO projects for the site portfolio. Per market:
 *   1. create_project              (idempotent — skips if the domain exists)
 *   2. update_project_context      (records the cohort + a business overview)
 *   3. create_rank_tracker         (local tracking, weekly)
 *   4. add_rank_tracking_keywords  (the seed set for that market)
 *
 * Usage:
 *   OPENSEO_URL=http://localhost:3001 OPENSEO_API_KEY=... \
 *     node scripts/openseo-provision.mjs markets.json --dry-run
 *   node scripts/openseo-provision.mjs markets.json
 *
 * markets.json:
 *   [{ "city": "Katy", "state": "TX",
 *      "domain": "ivycleanskaty.com", "cohort": "A-control" }]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOT YET RUN AGAINST A LIVE INSTANCE. Written from OpenSEO's schema and route
 * definitions (MCP_ROUTE = "/mcp", x-api-key auth in api-key-auth.ts, the tool
 * names registered under src/server/mcp/tools/). The initialize handshake and
 * the exact argument names for create_project / create_rank_tracker should be
 * confirmed with one manual call before running this across 100 markets.
 *
 * --dry-run prints every call without sending it. Start there.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFile } from "fs/promises";

const URL_BASE = process.env.OPENSEO_URL ?? "http://localhost:3001";
const API_KEY = process.env.OPENSEO_API_KEY;
const MCP = `${URL_BASE.replace(/\/$/, "")}/mcp`;

const [, , marketsPath, ...flags] = process.argv;
const DRY = flags.includes("--dry-run");
const US = 2840;

if (!marketsPath) {
  console.error("usage: node scripts/openseo-provision.mjs markets.json [--dry-run]");
  process.exit(1);
}
if (!API_KEY && !DRY) {
  console.error("OPENSEO_API_KEY is required (or pass --dry-run)");
  process.exit(1);
}

let rpcId = 0;

async function call(name, args) {
  if (DRY) {
    console.log(`    → ${name}(${JSON.stringify(args)})`);
    return { dryRun: true };
  }
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Streamable HTTP transport negotiates both; sending both is safest.
      Accept: "application/json, text/event-stream",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${res.statusText}`);

  const text = await res.text();
  // The transport may answer as SSE even for a single response.
  const payload = text.startsWith("event:")
    ? JSON.parse(text.split("\n").find((l) => l.startsWith("data:")).slice(5).trim())
    : JSON.parse(text);

  if (payload.error) throw new Error(`${name}: ${payload.error.message ?? JSON.stringify(payload.error)}`);
  return payload.result;
}

/** Seed keywords for one market. Keep it tight — every keyword is a weekly cost. */
function seedKeywords(city, state) {
  const c = city.toLowerCase();
  const st = state.toLowerCase();
  return [
    `house cleaning ${c}`,
    `house cleaning ${c} ${st}`,
    `cleaning services ${c}`,
    `cleaning services ${c} ${st}`,
    `maid service ${c}`,
    `deep cleaning ${c}`,
    `deep cleaning ${c} ${st}`,
    `move out cleaning ${c}`,
    `apartment cleaning ${c}`,
    `house cleaning near me`,
  ];
}

const markets = JSON.parse(await readFile(marketsPath, "utf-8"));
console.log(`\nOpenSEO provisioning — ${markets.length} markets → ${MCP}`);
console.log(DRY ? "DRY RUN — nothing will be sent\n" : "");

// Existing projects, so a re-run is idempotent rather than duplicating.
let existing = new Map();
if (!DRY) {
  try {
    const res = await call("list_projects", {});
    const rows = res?.structuredContent?.projects ?? res?.projects ?? [];
    existing = new Map(rows.filter((p) => p.domain).map((p) => [p.domain, p.id]));
    console.log(`${existing.size} existing project(s) found\n`);
  } catch (err) {
    console.error(`could not list existing projects: ${err.message}`);
    console.error("continuing — duplicates are possible\n");
  }
}

let created = 0, skipped = 0, failed = 0;

for (const m of markets) {
  const label = `${m.city}, ${m.state}`;
  const kw = seedKeywords(m.city, m.state);

  if (existing.has(m.domain)) {
    console.log(`  ⊙ ${label} — project exists, skipping`);
    skipped++;
    continue;
  }

  console.log(`  • ${label}  (${m.domain})  [${m.cohort ?? "untagged"}]`);
  try {
    const project = await call("create_project", {
      name: `${m.city} ${m.state}`,
      domain: m.domain,
      locationCode: US,
      languageCode: "en",
    });
    const projectId =
      project?.structuredContent?.projectId ?? project?.projectId ?? project?.id ?? "DRY";

    // Cohort lives in project context so the portfolio can be sliced by it later.
    await call("update_project_context", {
      projectId,
      sections: [
        { key: "cohort", title: "Portfolio cohort", content: m.cohort ?? "A-control" },
        {
          key: "business_overview",
          title: "Business overview",
          content: `Ivy Cleans — residential and commercial cleaning serving ${label} and surrounding areas. Portfolio site, launched ${new Date().toISOString().slice(0, 10)}.`,
        },
      ],
    });

    // locationName set => LOCAL tracking. For a service business the map-pack
    // position is the number that matters, not the national organic one.
    const tracker = await call("create_rank_tracker", {
      projectId,
      domain: m.domain,
      locationCode: US,
      locationName: `${m.city},${stateName(m.state)},United States`,
      languageCode: "en",
      devices: "mobile", // local service search is overwhelmingly mobile
      serpDepth: 20,
      scheduleInterval: "weekly",
    });
    const configId =
      tracker?.structuredContent?.configId ?? tracker?.configId ?? tracker?.id ?? "DRY";

    await call("add_rank_tracking_keywords", { projectId, configId, keywords: kw });

    created++;
  } catch (err) {
    console.error(`    ✗ ${err.message}`);
    failed++;
  }
}

console.log(`\n${created} created · ${skipped} skipped · ${failed} failed`);
if (DRY) console.log("Dry run — re-run without --dry-run to apply.\n");
else console.log("\nNext: connect a Search Console property to each project. That step is manual.\n");
process.exit(failed > 0 ? 1 : 0);

/** DataForSEO location_name for US cities is "City,StateName,United States". */
function stateName(code) {
  const S = {
    AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
    CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",
    HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",
    LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
    MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",
    NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",
    OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",
    SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
    VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  };
  const name = S[code.toUpperCase()];
  if (!name) throw new Error(`unknown state code "${code}"`);
  return name;
}
