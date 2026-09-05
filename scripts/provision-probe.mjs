#!/usr/bin/env node
/*
 * scripts/provision-probe.mjs
 *
 * Verifies all three provisioning credentials without buying anything.
 *
 *   PORKBUN_API_KEY=... PORKBUN_SECRET_KEY=... \
 *   VERCEL_TOKEN=... VERCEL_PROJECT_ID=... VERCEL_TEAM_ID=... GLOBAL_CONFIG_ID=... \
 *   node scripts/provision-probe.mjs [domain-to-price-check]
 *
 * Checks credentials, confirms the Vercel plan is Pro (Hobby caps at 50
 * domains per project) and confirms Porkbun's API registration is unlocked —
 * it stays locked until the account has bought ONE domain through the
 * website, so that first purchase is manual whatever else is automated.
 *
 * Exits 1 on any failure. Run before the first real publish.
 */

const pb = { k: process.env.PORKBUN_API_KEY, s: process.env.PORKBUN_SECRET_KEY };
const vc = {
  t: process.env.VERCEL_TOKEN,
  p: process.env.VERCEL_PROJECT_ID,
  team: process.env.VERCEL_TEAM_ID,
  gc: process.env.GLOBAL_CONFIG_ID,
};
const testDomain = process.argv[2] ?? "ivycleansprobetest.com";
let fail = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.log(`  ✗ ${m}`); fail++; };

console.log("\n── Porkbun ──");
if (!pb.k || !pb.s) bad("PORKBUN_API_KEY / PORKBUN_SECRET_KEY not set");
else {
  try {
    const r = await fetch("https://api.porkbun.com/api/json/v3/ping", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: pb.k, secretapikey: pb.s }),
    }).then((x) => x.json());
    if (r.status === "SUCCESS") ok(`credentials valid (your IP ${r.yourIp})`);
    else bad(`ping: ${r.message}`);

    const c = await fetch(`https://api.porkbun.com/api/json/v3/domain/checkDomain/${testDomain}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: pb.k, secretapikey: pb.s }),
    }).then((x) => x.json());
    const resp = c.response ?? c;
    if (c.status === "SUCCESS") ok(`checkDomain ${testDomain}: avail=${resp.avail} price=$${resp.price}`);
    else bad(`checkDomain: ${c.message}`);

    const l = await fetch("https://api.porkbun.com/api/json/v3/domain/listAll", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: pb.k, secretapikey: pb.s, start: 0 }),
    }).then((x) => x.json());
    if (l.status === "SUCCESS") {
      const n = (l.domains ?? []).length;
      if (n > 0) ok(`account owns ${n} domain(s) — API registration is unlocked`);
      else bad("account owns 0 domains — Porkbun requires ONE manual registration before API registration works");
    } else bad(`listAll: ${l.message}`);
  } catch (e) { bad(`Porkbun: ${e.message}`); }
}

console.log("\n── Vercel ──");
if (!vc.t || !vc.p) bad("VERCEL_TOKEN / VERCEL_PROJECT_ID not set");
else {
  const q = vc.team ? `?teamId=${vc.team}` : "";
  const H = { Authorization: `Bearer ${vc.t}` };
  try {
    const me = await fetch("https://api.vercel.com/v2/user", { headers: H }).then((x) => x.json());
    if (me.user) ok(`token valid (${me.user.username ?? me.user.email})`);
    else bad(`token: ${me.error?.message}`);

    const pr = await fetch(`https://api.vercel.com/v9/projects/${vc.p}${q}`, { headers: H }).then((x) => x.json());
    if (pr.id) ok(`project ${pr.name} (${pr.id})`);
    else bad(`project: ${pr.error?.message}`);

    const team = vc.team
      ? await fetch(`https://api.vercel.com/v2/teams/${vc.team}`, { headers: H }).then((x) => x.json())
      : null;
    if (team) {
      const plan = team.billing?.plan ?? "unknown";
      if (plan === "pro" || plan === "enterprise") ok(`team plan: ${plan}`);
      else bad(`team plan: ${plan} — Hobby caps at 50 domains per project; Pro is required`);
    }

    const cfg = await fetch(
      `https://api.vercel.com/v6/domains/${testDomain}/config?projectIdOrName=${vc.p}${vc.team ? `&teamId=${vc.team}` : ""}`,
      { headers: H }
    ).then((x) => x.json());
    if (cfg.recommendedIPv4) {
      ok(`config endpoint answers — recommended A: ${cfg.recommendedIPv4?.[0]?.value?.[0] ?? "?"}, CNAME: ${cfg.recommendedCNAME?.[0]?.value ?? "?"}`);
    } else bad(`config: ${cfg.error?.message ?? "no recommendations returned"}`);
  } catch (e) { bad(`Vercel: ${e.message}`); }
}

console.log("\n── Global Config ──");
if (!vc.t || !vc.gc) bad("GLOBAL_CONFIG_ID not set");
else {
  const q = vc.team ? `?teamId=${vc.team}` : "";
  try {
    const m = await fetch(`https://api.vercel.com/v1/global-config/${vc.gc}${q}`, {
      headers: { Authorization: `Bearer ${vc.t}` },
    }).then((x) => x.json());
    if (m.id) ok(`store "${m.slug}" — ${m.itemCount} item(s), ${m.sizeInBytes} bytes`);
    else bad(`store: ${m.error?.message}`);
  } catch (e) { bad(`Global Config: ${e.message}`); }
}

console.log(fail ? `\n✗ ${fail} problem(s)\n` : "\n✓ all three providers ready\n");
process.exit(fail ? 1 : 0);
