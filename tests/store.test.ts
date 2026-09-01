// tests/store.test.ts
/*
 * TDD for the Plan 2b async store: getCity/getDefaultCity/resolveCityKey/
 * listLiveCityKeys/revalidateCity, plus the _domains.json host index.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getCity,
  listLiveCityKeys,
  resolveCityKey,
  revalidateCity,
  type DomainsIndex,
} from "../src/content/store";

describe("getCity", () => {
  it("resolves to a validated CityContent doc for a known key", async () => {
    const c = await getCity("minneapolis");
    expect(c.city).toBe("Minneapolis");
  });

  it("rejects for an unknown city key", async () => {
    await expect(getCity("atlantis")).rejects.toThrow(/unknown city|not found/i);
  });
});

describe("resolveCityKey", () => {
  it("falls back to the default city for an unmapped host", () => {
    expect(resolveCityKey("localhost:3100")).toBe("minneapolis");
  });

  it("maps a host to its city key via an injected hosts index", () => {
    const domains: DomainsIndex = {
      default: "minneapolis",
      hosts: { "miamicleans.com": "miami" },
    };
    expect(resolveCityKey("miamicleans.com", domains)).toBe("miami");
  });
});

describe("listLiveCityKeys", () => {
  it("resolves to the keys of cities whose status is live", async () => {
    expect(await listLiveCityKeys()).toEqual(["minneapolis"]);
  });
});

/*
 * Declared AFTER the listLiveCityKeys suite on purpose: the scratch document
 * only exists while this describe's hooks are active, and listLiveCityKeys()
 * would choke on it (that is exactly the failure the guard produces).
 *
 * STALE-COMMENT FIX (Task 4): "no other suite lists the content directory" is
 * no longer true. tests/drafts.test.ts also calls listLiveCityKeys(), and
 * tests/pipeline.test.ts writes content/ztest-stubville.json — and vitest runs
 * test files in parallel by default. So while badcity.json exists, a
 * concurrent listLiveCityKeys() in another file would hit the very throw this
 * suite is provoking. The window is milliseconds wide and has not been
 * observed, but the protection is timing, not design: pinning
 * `fileParallelism: false` (or isolating content-mutating suites) is the real
 * fix, tracked for Task 6.
 */
describe("registry key must match the city name", () => {
  const badPath = path.join(process.cwd(), "content", "badcity.json");

  beforeAll(async () => {
    // Minimal-but-valid document (validateCityContent passes) whose only
    // problem is that "Not Matching" slugifies to "not-matching", not "badcity".
    await writeFile(
      badPath,
      JSON.stringify({
        city: "Not Matching",
        state: "XX",
        phone: "555-0000",
        phoneHref: "tel:5550000",
        address: "1 Nowhere",
        status: "draft",
        stateName: "Nowhereland",
        phoneDisplay: "(555) 000-0000",
        hasSuburbPages: false,
        maps: { front: null, home: null, contact: null },
        research: { suburbs: [], zips: [], conditions: [], mapEmbedUrl: null },
        sections: {},
      }),
      "utf-8",
    );
  });

  afterAll(async () => {
    await rm(badPath, { force: true });
    revalidateCity("badcity");
  });

  it("rejects a document whose city name slugifies to a different key", async () => {
    await expect(getCity("badcity")).rejects.toThrow(
      "city document 'badcity': city name 'Not Matching' slugifies to 'not-matching', " +
        "which must equal the registry key — preview links would 404",
    );
  });

  it("accepts the shipped documents, whose names match their filenames", async () => {
    expect((await getCity("minneapolis")).city).toBe("Minneapolis");
    expect((await getCity("testville")).city).toBe("Testville");
  });
});

describe("per-process cache", () => {
  it("returns the same object on a second call, and a fresh load after revalidateCity", async () => {
    const first = await getCity("minneapolis");
    const second = await getCity("minneapolis");
    expect(second).toBe(first);

    revalidateCity("minneapolis");

    const third = await getCity("minneapolis");
    expect(third).not.toBe(first);
    expect(third).toEqual(first);
  });
});
