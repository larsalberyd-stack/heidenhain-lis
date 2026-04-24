// Identify companies that need Clay re-enrichment based on Per's targeting rules:
//   - <2 valid decision-makers (after Quality/Production/Operations exclusion)
//   - OR country mismatch (dominant contact country != registered country)
//   - OR no contacts at all
//
// Outputs: needs-enrichment.csv with priority + reason.

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const OUT = path.resolve(__dirname, "..", "needs-enrichment.csv");

// Mirror shared/targeting.ts logic (CJS can't import TS directly)
const EXCLUDE = ["quality", "qa ", "qa,", "qa/", "production", "manufacturing",
  "operations", "operativ", "service", "after sales", "aftermarket",
  "supply chain", "logistics", "warehouse", "marketing", "communication",
  "kommunikation", "hr ", "human resources", "people ", "finance",
  "accounting", "controller", "cfo", "legal", "compliance", "facility", "facilities"];
const TECH = ["cto", "chief technology", "chief technical", "vp technology",
  "vp r&d", "vp engineering", "vp product", "head of r&d", "head of engineering",
  "head of product", "head of design", "director engineering", "director r&d",
  "director, r&d", "director, engineering", "director of engineering",
  "director of r&d", "engineering manager", "r&d manager", "rd manager",
  "design manager", "technical manager", "lead engineer", "system architect",
  "principal engineer", "innovation manager", "product manager"];
const PROC = ["cpo", "chief procurement", "chief purchasing", "vp procurement",
  "vp purchasing", "head of procurement", "head of purchasing",
  "director procurement", "director purchasing", "purchasing manager",
  "procurement manager", "category manager", "strategic sourcing"];

function classify(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  if (EXCLUDE.some(k => t.includes(k))) return null;
  if (TECH.some(k => t.includes(k))) return "tech";
  if (PROC.some(k => t.includes(k))) return "procurement";
  return null;
}

function detectCountry(loc) {
  if (!loc) return null;
  const l = loc.toLowerCase();
  if (l.includes("sweden") || l.includes("sverige")) return "Sweden";
  if (l.includes("norway") || l.includes("norge")) return "Norway";
  if (l.includes("finland") || l.includes("suomi")) return "Finland";
  if (l.includes("denmark") || l.includes("danmark")) return "Denmark";
  return null;
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });

  const [rows] = await conn.query(`
    SELECT co.id AS cid, co.name AS company, co.domain, co.country, co.focus,
           ct.fullName, ct.title, ct.location
    FROM companies co
    LEFT JOIN contacts ct ON ct.companyId = co.id
    ORDER BY co.id
  `);

  const byCo = new Map();
  for (const r of rows) {
    if (!byCo.has(r.cid)) byCo.set(r.cid, {
      cid: r.cid, company: r.company, domain: r.domain, country: r.country, focus: r.focus,
      contacts: [], decisionMakers: [], excluded: [], countryBreakdown: {},
    });
    const c = byCo.get(r.cid);
    if (!r.fullName) continue;
    c.contacts.push({ fullName: r.fullName, title: r.title, location: r.location });
    const cat = classify(r.title);
    if (cat) c.decisionMakers.push({ fullName: r.fullName, title: r.title, location: r.location, cat });
    else if (r.title) c.excluded.push({ fullName: r.fullName, title: r.title });
    const cc = detectCountry(r.location);
    if (cc) c.countryBreakdown[cc] = (c.countryBreakdown[cc] || 0) + 1;
  }

  const issues = [];
  for (const c of byCo.values()) {
    const reasons = [];
    let priority = "low";

    if (c.contacts.length === 0) {
      reasons.push("Inga kontakter alls");
      priority = "high";
    } else if (c.decisionMakers.length === 0) {
      reasons.push(`Inga beslutsfattare (${c.contacts.length} kontakter, alla i exkluderade roller)`);
      priority = "high";
    } else if (c.decisionMakers.length === 1) {
      reasons.push(`Endast 1 beslutsfattare av ${c.contacts.length} kontakter`);
      priority = "medium";
    }

    // Country mismatch
    const sortedC = Object.entries(c.countryBreakdown).sort((a, b) => b[1] - a[1]);
    if (sortedC.length > 0) {
      const [topCountry, topN] = sortedC[0];
      const home = c.countryBreakdown[c.country] || 0;
      if (topCountry !== c.country && topN >= 2 && topN > home) {
        reasons.push(`Country mismatch: registrerat ${c.country}, men ${topN}/${c.contacts.length} kontakter i ${topCountry}`);
        if (priority !== "high") priority = "medium";
      }
    }

    if (reasons.length === 0) continue;

    issues.push({
      priority,
      cid: c.cid,
      company: c.company,
      domain: c.domain,
      country: c.country,
      focus: c.focus,
      n_contacts: c.contacts.length,
      n_decision_makers: c.decisionMakers.length,
      reasons: reasons.join(" | "),
      excluded_titles: c.excluded.map(x => `${x.fullName} (${x.title})`).slice(0, 3).join(" | "),
      decision_maker_samples: c.decisionMakers.map(d => `${d.fullName} (${d.title}) [${d.location || "?"}]`).slice(0, 3).join(" | "),
    });
  }

  // Sort: high first, then AAA companies first within priority
  const focusRank = { AAA: 0, AA: 1, A: 2, B: 3, C: 4, "": 5, null: 5 };
  const priRank = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => {
    if (priRank[a.priority] !== priRank[b.priority]) return priRank[a.priority] - priRank[b.priority];
    return (focusRank[a.focus] ?? 5) - (focusRank[b.focus] ?? 5);
  });

  const header = ["priority", "cid", "company", "domain", "country", "focus",
    "n_contacts", "n_decision_makers", "reasons", "decision_maker_samples", "excluded_titles"];
  const lines = [header.join(",")];
  for (const r of issues) lines.push(header.map(h => csvEscape(r[h])).join(","));
  fs.writeFileSync(OUT, lines.join("\n") + "\n");

  const high = issues.filter(i => i.priority === "high").length;
  const med = issues.filter(i => i.priority === "medium").length;
  console.log(`Wrote ${issues.length} companies to ${OUT}`);
  console.log(`  HIGH priority (need re-enrichment urgent): ${high}`);
  console.log(`  MEDIUM priority: ${med}`);
  console.log(`\nTop 15 HIGH priority:`);
  for (const i of issues.filter(x => x.priority === "high").slice(0, 15)) {
    console.log(`  [${i.focus || "?"}] ${i.company} — ${i.reasons}`);
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
