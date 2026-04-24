// Comprehensive data quality audit + CSV exports for cleanup.
// Outputs three CSVs in the project root:
//   - country-mismatch-companies.csv  (companies whose contacts mostly live elsewhere)
//   - encoding-broken-contacts.csv    (contacts with mojibake in name)
//   - duplicate-contacts.csv          (likely duplicates by normalized email or linkedinUrl)
//
// READ-ONLY. Apply fixes via separate scripts after reviewing output.

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const OUT_DIR = path.resolve(__dirname, "..");

const NORDIC_COUNTRIES = ["Sweden", "Norway", "Finland", "Denmark"];

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filename, header, rows) {
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map(h => csvEscape(r[h])).join(","));
  const full = path.join(OUT_DIR, filename);
  fs.writeFileSync(full, lines.join("\n") + "\n");
  console.log(`→ Wrote ${rows.length} rows to ${full}`);
}

function detectContactCountry(location) {
  if (!location) return null;
  const l = location.toLowerCase();
  for (const c of NORDIC_COUNTRIES) {
    if (l.includes(c.toLowerCase())) return c;
  }
  if (l.includes("danmark") || l.includes("denmark")) return "Denmark";
  if (l.includes("sverige") || l.includes("sweden")) return "Sweden";
  if (l.includes("norge") || l.includes("norway")) return "Norway";
  if (l.includes("finland") || l.includes("suomi")) return "Finland";
  return null;
}

function hasMojibake(s) {
  if (!s) return false;
  return /Ã[¥¤¶§Ã]|Ã©|â€™|â€œ|â€|Â°/.test(s);
}

// Repair Latin1-as-UTF8 double-encoding mojibake.
// Example: "HÃ¥vard" (bytes for å interpreted as Latin1, then re-encoded as UTF-8) → "Håvard"
function repairMojibake(s) {
  if (!s) return s;
  try {
    return Buffer.from(s, "latin1").toString("utf-8");
  } catch {
    return s;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  // ─────────────────────────────────────────────────────────────────────
  // 1. Country mismatch on company level
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n=== COMPANY-LEVEL COUNTRY MISMATCH ===");
  const [rows] = await conn.query(`
    SELECT co.id AS company_id, co.name AS company, co.domain, co.country AS current_country,
           co.city, c.fullName, c.title, c.location, c.linkedinUrl
    FROM companies co
    LEFT JOIN contacts c ON c.companyId = co.id
    WHERE co.country IS NOT NULL AND co.country != ''
    ORDER BY co.name
  `);

  const byCompany = new Map();
  for (const r of rows) {
    if (!byCompany.has(r.company_id)) {
      byCompany.set(r.company_id, {
        company_id: r.company_id, company: r.company, domain: r.domain,
        current_country: r.current_country, city: r.city,
        contactCountries: {}, totalContacts: 0, contactSamples: [],
      });
    }
    const c = byCompany.get(r.company_id);
    if (r.fullName) {
      c.totalContacts++;
      const cc = detectContactCountry(r.location);
      if (cc) c.contactCountries[cc] = (c.contactCountries[cc] || 0) + 1;
      if (c.contactSamples.length < 3) c.contactSamples.push(`${r.fullName} (${r.title || "?"}) — ${r.location || "?"}`);
    }
  }

  const mismatches = [];
  for (const c of byCompany.values()) {
    if (c.totalContacts === 0) continue;
    const sortedCountries = Object.entries(c.contactCountries).sort((a, b) => b[1] - a[1]);
    if (sortedCountries.length === 0) continue;
    const [topCountry, topCount] = sortedCountries[0];
    const inHomeCountry = c.contactCountries[c.current_country] || 0;
    if (topCountry !== c.current_country && topCount >= 2 && topCount > inHomeCountry) {
      mismatches.push({
        company_id: c.company_id,
        company: c.company,
        domain: c.domain,
        current_country: c.current_country,
        suggested_country: topCountry,
        contacts_in_current: inHomeCountry,
        contacts_in_suggested: topCount,
        total_contacts: c.totalContacts,
        all_country_breakdown: sortedCountries.map(([k, v]) => `${k}:${v}`).join("; "),
        contact_samples: c.contactSamples.join(" | "),
      });
    }
  }
  mismatches.sort((a, b) => b.contacts_in_suggested - a.contacts_in_suggested);
  console.log(`Found ${mismatches.length} companies where dominant contact country differs from registered country.`);
  writeCsv("country-mismatch-companies.csv",
    ["company_id", "company", "domain", "current_country", "suggested_country",
     "contacts_in_current", "contacts_in_suggested", "total_contacts",
     "all_country_breakdown", "contact_samples"],
    mismatches);

  // ─────────────────────────────────────────────────────────────────────
  // 2. Encoding (mojibake) detection
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n=== ENCODING (MOJIBAKE) DETECTION ===");
  const [allContacts] = await conn.query(`
    SELECT id, companyId, firstName, lastName, fullName, title, location, email, phone, linkedinUrl
    FROM contacts ORDER BY companyId, fullName
  `);
  const broken = [];
  for (const c of allContacts) {
    if (hasMojibake(c.firstName) || hasMojibake(c.lastName) || hasMojibake(c.fullName)
        || hasMojibake(c.title) || hasMojibake(c.location)) {
      broken.push({
        id: c.id,
        companyId: c.companyId,
        fullName: c.fullName,
        suggested_fullName: repairMojibake(c.fullName),
        firstName: c.firstName,
        suggested_firstName: repairMojibake(c.firstName),
        lastName: c.lastName,
        suggested_lastName: repairMojibake(c.lastName),
        title: c.title,
        location: c.location,
      });
    }
  }
  console.log(`Found ${broken.length} contacts with mojibake in name/title/location.`);
  writeCsv("encoding-broken-contacts.csv",
    ["id", "companyId", "fullName", "suggested_fullName", "firstName", "suggested_firstName",
     "lastName", "suggested_lastName", "title", "location"],
    broken);

  // ─────────────────────────────────────────────────────────────────────
  // 3. Duplicate detection (within same company)
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n=== DUPLICATE CONTACT DETECTION ===");
  const norm = s => (s || "").toLowerCase().trim();
  const repairedKey = c => norm(repairMojibake(c.fullName)).replace(/\s+/g, " ");

  const groups = new Map();
  for (const c of allContacts) {
    const keys = new Set();
    if (c.email) keys.add(`email:${norm(c.email)}`);
    if (c.linkedinUrl) keys.add(`li:${norm(c.linkedinUrl)}`);
    if (c.companyId && c.fullName) keys.add(`name:${c.companyId}:${repairedKey(c)}`);
    for (const k of keys) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
  }

  const dupeIds = new Map(); // contactId → set of group keys it shares
  for (const [k, arr] of groups) {
    if (arr.length > 1) {
      for (const c of arr) {
        if (!dupeIds.has(c.id)) dupeIds.set(c.id, { contact: c, sharedWith: new Set() });
        for (const other of arr) if (other.id !== c.id) dupeIds.get(c.id).sharedWith.add(other.id);
      }
    }
  }

  // Cluster: pick lowest id as canonical
  const seen = new Set();
  const clusters = [];
  for (const [id, info] of dupeIds) {
    if (seen.has(id)) continue;
    const cluster = new Set([id, ...info.sharedWith]);
    // Expand transitive duplicates
    let changed = true;
    while (changed) {
      changed = false;
      for (const cid of cluster) {
        const ci = dupeIds.get(cid);
        if (!ci) continue;
        for (const other of ci.sharedWith) {
          if (!cluster.has(other)) { cluster.add(other); changed = true; }
        }
      }
    }
    for (const cid of cluster) seen.add(cid);
    clusters.push([...cluster].sort((a, b) => a - b));
  }

  const dupRows = [];
  for (const cluster of clusters) {
    const canonicalId = cluster[0];
    for (const id of cluster) {
      const c = allContacts.find(x => x.id === id);
      dupRows.push({
        cluster_canonical_id: canonicalId,
        contact_id: c.id,
        is_canonical: c.id === canonicalId ? "yes" : "no",
        companyId: c.companyId,
        fullName: c.fullName,
        repaired_fullName: repairMojibake(c.fullName),
        email: c.email,
        phone: c.phone,
        linkedinUrl: c.linkedinUrl,
        title: c.title,
      });
    }
  }
  console.log(`Found ${clusters.length} duplicate clusters covering ${dupRows.length} contacts.`);
  writeCsv("duplicate-contacts.csv",
    ["cluster_canonical_id", "contact_id", "is_canonical", "companyId", "fullName",
     "repaired_fullName", "email", "phone", "linkedinUrl", "title"],
    dupRows);

  // ─────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n=== SUMMARY ===");
  console.log(`Companies with country mismatch: ${mismatches.length}`);
  console.log(`Contacts with broken encoding:   ${broken.length}`);
  console.log(`Duplicate clusters / contacts:   ${clusters.length} clusters / ${dupRows.length} contacts`);
  console.log("\nReview the CSVs in the project root, then run the matching fix scripts.");

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
