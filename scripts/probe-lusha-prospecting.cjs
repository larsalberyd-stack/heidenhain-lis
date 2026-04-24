// Real probe with correct Lusha schema — search for Engineering+ manager-and-up at Alimak.
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const API_KEY = "a2d7e547-ce42-403d-8d6e-a8fc7db7f98c";
const BASE = "https://api.lusha.com";

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", "api_key": API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function main() {
  // 1. List all 16 departments so we can pick the right include/exclude set
  const dept = await call("GET", "/prospecting/filters/contacts/departments");
  console.log("=== ALL DEPARTMENTS ===");
  for (const d of dept.body) console.log("  -", d);

  // 2. Probe for company-side schema by trying common include shapes
  console.log("\n=== company filter schema probe ===");
  const candidates = [
    { include: { domains: ["alimak.com"] } },
    { include: { names: ["Alimak"] } },
    { include: { website: "alimak.com" } },
    { include: { sizes: ["501-1000"] } },
    { include: { industries: ["Manufacturing"] } },
    { include: { locations: [{ country: "Sweden" }] } },
  ];
  for (const c of candidates) {
    const r = await call("POST", "/prospecting/contact/search", {
      pages: { page: 0, size: 10 },
      filters: { companies: c, contacts: { include: { departments: ["Engineering & Technical"], seniority: [5,6,8,9] } } },
    });
    console.log(`  ${JSON.stringify(c)} → ${r.status} ${r.body?.message || ''} ${r.body?.totalResults != null ? 'totalResults=' + r.body.totalResults : ''}`);
  }

  // 3. The real call: Engineering+technical, manager and up, Sweden
  console.log("\n=== REAL SEARCH: Engineering & Technical / manager+ / Sweden ===");
  const r = await call("POST", "/prospecting/contact/search", {
    pages: { page: 0, size: 10 },
    filters: {
      contacts: {
        include: {
          departments: ["Engineering & Technical"],
          seniority: [5, 6, 8, 9], // manager, director, vp, c-suite
          locations: [{ country: "Sweden" }],
        },
      },
      companies: {},
    },
  });
  console.log(`status=${r.status}`);
  console.log("body:", JSON.stringify(r.body, null, 2).slice(0, 3000));
}
main().catch(e => { console.error(e); process.exit(1); });
