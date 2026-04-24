// Fix mojibake encoding (HÃ¥vard → Håvard) and merge same-company duplicate contacts.
//
// Cross-company duplicates are EXPORTED to a CSV but NOT auto-merged — those usually
// indicate duplicate company records that need a business decision.
//
// Usage:
//   node scripts/fix-encoding-and-dedupe.cjs           # dry run, prints what it would do
//   node scripts/fix-encoding-and-dedupe.cjs --apply   # actually writes to DB

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const APPLY = process.argv.includes("--apply");
const OUT_DIR = path.resolve(__dirname, "..");

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filename, header, rows) {
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map(h => csvEscape(r[h])).join(","));
  fs.writeFileSync(path.join(OUT_DIR, filename), lines.join("\n") + "\n");
}

// CP1252 chars that JS doesn't map to bytes 0x80-0x9F when using "latin1" encoding.
// Needed because mojibake originated from CP1252-as-UTF8 double encoding.
const CP1252_REMAP = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function hasMojibake(s) {
  if (!s) return false;
  for (let i = 0; i < s.length - 1; i++) {
    const c1 = s.codePointAt(i);
    const c2 = s.codePointAt(i + 1);
    if (c1 === 0x00C3 && (c2 >= 0x0080 && c2 <= 0x00FF || CP1252_REMAP[c2] !== undefined)) return true;
    if (c1 === 0x00C2 && c2 >= 0x0080 && c2 <= 0x00FF) return true;
    if (c1 === 0x00E2 && c2 === 0x20AC) return true;
  }
  return false;
}
function repairMojibake(s) {
  if (!s || !hasMojibake(s)) return s;
  const bytes = [];
  for (const ch of [...s]) {
    const cp = ch.codePointAt(0);
    if (CP1252_REMAP[cp] !== undefined) bytes.push(CP1252_REMAP[cp]);
    else if (cp <= 0xFF) bytes.push(cp);
    else return s;
  }
  try {
    const repaired = Buffer.from(bytes).toString("utf-8");
    if (repaired.includes("\uFFFD")) return s;
    return repaired;
  } catch {
    return s;
  }
}

function preferLonger(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.length >= b.length ? a : b;
}

function preferTruthy(a, b) {
  return a || b;
}

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log(APPLY ? "🚨 APPLY MODE — writing to DB" : "🔍 DRY RUN — no DB writes");

  // ─── 1. Fix mojibake on contacts ────────────────────────────────────
  console.log("\n=== ENCODING REPAIR ===");
  const [contactsAll] = await conn.query(`
    SELECT id, firstName, lastName, fullName, title, location FROM contacts
  `);
  let encodingFixed = 0;
  const tryFix = (orig) => {
    if (!hasMojibake(orig)) return null;
    const fixed = repairMojibake(orig);
    return fixed === orig ? null : fixed;
  };
  for (const c of contactsAll) {
    const updates = {};
    const fn = tryFix(c.firstName); if (fn !== null) updates.firstName = fn;
    const ln = tryFix(c.lastName);  if (ln !== null) updates.lastName = ln;
    const full = tryFix(c.fullName); if (full !== null) updates.fullName = full;
    const ti = tryFix(c.title);     if (ti !== null) updates.title = ti;
    const lo = tryFix(c.location);  if (lo !== null) updates.location = lo;
    if (Object.keys(updates).length === 0) continue;
    encodingFixed++;
    console.log(`  contact ${c.id}: ${c.fullName} → ${updates.fullName || c.fullName}`);
    if (APPLY) {
      const setClause = Object.keys(updates).map(k => `\`${k}\` = ?`).join(", ");
      await conn.execute(`UPDATE contacts SET ${setClause} WHERE id = ?`,
        [...Object.values(updates), c.id]);
    }
  }
  console.log(`Encoding fixed: ${encodingFixed} contacts.`);

  // ─── 2. Dedupe same-company contacts ────────────────────────────────
  console.log("\n=== SAME-COMPANY DUPLICATE MERGE ===");
  const [contacts] = await conn.query(`
    SELECT id, companyId, firstName, lastName, fullName, title, seniority, department,
           email, emailVerified, phone, linkedinUrl, location, priority, notes, createdAt
    FROM contacts ORDER BY id
  `);

  const norm = s => (s || "").toLowerCase().trim();
  const repairedKey = c => norm(repairMojibake(c.fullName)).replace(/\s+/g, " ");

  const groups = new Map();
  for (const c of contacts) {
    const keys = new Set();
    if (c.email) keys.add(`email:${norm(c.email)}`);
    if (c.linkedinUrl) keys.add(`li:${norm(c.linkedinUrl)}`);
    if (c.companyId && c.fullName) keys.add(`name:${c.companyId}:${repairedKey(c)}`);
    for (const k of keys) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
  }

  const dupOf = new Map();
  for (const [, arr] of groups) {
    if (arr.length > 1) for (const c of arr) {
      if (!dupOf.has(c.id)) dupOf.set(c.id, new Set());
      for (const o of arr) if (o.id !== c.id) dupOf.get(c.id).add(o.id);
    }
  }

  const seen = new Set();
  const sameCompanyClusters = [];
  const crossCompanyClusters = [];
  for (const id of dupOf.keys()) {
    if (seen.has(id)) continue;
    const cluster = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const cid of cluster) {
        for (const o of dupOf.get(cid) || []) {
          if (!cluster.has(o)) { cluster.add(o); changed = true; }
        }
      }
    }
    for (const cid of cluster) seen.add(cid);
    const ids = [...cluster].sort((a, b) => a - b);
    const cs = ids.map(i => contacts.find(c => c.id === i));
    const companies = new Set(cs.map(c => c.companyId));
    if (companies.size === 1) sameCompanyClusters.push(cs);
    else crossCompanyClusters.push(cs);
  }

  console.log(`Same-company clusters to merge: ${sameCompanyClusters.length}`);
  console.log(`Cross-company clusters (NOT auto-merged, exported): ${crossCompanyClusters.length}`);

  let mergedContacts = 0;
  let activitiesReassigned = 0;
  let emailsReassigned = 0;

  for (const cluster of sameCompanyClusters) {
    // Pick canonical: prefer the one with most filled fields, tie-break by lowest id
    const score = c => [c.email, c.phone, c.linkedinUrl, c.title, c.location, c.notes].filter(Boolean).length;
    const sorted = [...cluster].sort((a, b) => {
      const sa = score(a), sb = score(b);
      if (sa !== sb) return sb - sa;
      return a.id - b.id;
    });
    const canonical = sorted[0];
    const losers = sorted.slice(1);

    // Merge fields from losers into canonical
    const merged = { ...canonical };
    for (const l of losers) {
      merged.firstName = preferLonger(merged.firstName, l.firstName);
      merged.lastName = preferLonger(merged.lastName, l.lastName);
      merged.fullName = preferLonger(merged.fullName, l.fullName);
      merged.title = preferLonger(merged.title, l.title);
      merged.seniority = preferTruthy(merged.seniority, l.seniority);
      merged.department = preferTruthy(merged.department, l.department);
      merged.email = preferTruthy(merged.email, l.email);
      merged.emailVerified = merged.emailVerified || l.emailVerified;
      merged.phone = preferTruthy(merged.phone, l.phone);
      merged.linkedinUrl = preferTruthy(merged.linkedinUrl, l.linkedinUrl);
      merged.location = preferLonger(merged.location, l.location);
      if (!merged.notes && l.notes) merged.notes = l.notes;
      else if (l.notes && merged.notes && !merged.notes.includes(l.notes)) merged.notes = `${merged.notes}\n${l.notes}`;
    }
    // Apply mojibake repair on merged result
    merged.firstName = repairMojibake(merged.firstName);
    merged.lastName = repairMojibake(merged.lastName);
    merged.fullName = repairMojibake(merged.fullName);
    merged.title = repairMojibake(merged.title);
    merged.location = repairMojibake(merged.location);

    console.log(`\n  cluster (company ${canonical.companyId}): keep id=${canonical.id} (${merged.fullName}), drop ids=[${losers.map(l => l.id).join(",")}]`);

    if (APPLY) {
      // Reassign activities and emails to canonical
      for (const l of losers) {
        const [actRes] = await conn.execute(`UPDATE activities SET contactId = ? WHERE contactId = ?`, [canonical.id, l.id]);
        const [emailRes] = await conn.execute(`UPDATE generated_emails SET contactId = ? WHERE contactId = ?`, [canonical.id, l.id]);
        activitiesReassigned += actRes.affectedRows;
        emailsReassigned += emailRes.affectedRows;
      }
      // Update canonical with merged fields
      await conn.execute(`
        UPDATE contacts SET firstName=?, lastName=?, fullName=?, title=?, seniority=?, department=?,
          email=?, emailVerified=?, phone=?, linkedinUrl=?, location=?, notes=?
        WHERE id=?`,
        [merged.firstName, merged.lastName, merged.fullName, merged.title, merged.seniority,
         merged.department, merged.email, merged.emailVerified, merged.phone,
         merged.linkedinUrl, merged.location, merged.notes, canonical.id]);
      // Delete losers
      await conn.execute(`DELETE FROM contacts WHERE id IN (${losers.map(() => "?").join(",")})`,
        losers.map(l => l.id));
    }
    mergedContacts += losers.length;
  }

  console.log(`\nSame-company contacts merged away: ${mergedContacts}`);
  if (APPLY) {
    console.log(`Activities reassigned: ${activitiesReassigned}`);
    console.log(`Emails reassigned: ${emailsReassigned}`);
  }

  // ─── 3. Export cross-company clusters for Lars to review ────────────
  console.log("\n=== CROSS-COMPANY DUPLICATE EXPORT ===");
  const crossRows = [];
  for (const cluster of crossCompanyClusters) {
    const cid = cluster[0].id;
    for (const c of cluster) {
      crossRows.push({
        cluster_canonical_id: cid,
        contact_id: c.id,
        companyId: c.companyId,
        fullName: repairMojibake(c.fullName),
        email: c.email,
        phone: c.phone,
        linkedinUrl: c.linkedinUrl,
        title: c.title,
      });
    }
  }
  writeCsv("cross-company-duplicates.csv",
    ["cluster_canonical_id", "contact_id", "companyId", "fullName", "email", "phone", "linkedinUrl", "title"],
    crossRows);
  console.log(`→ Wrote ${crossRows.length} rows to cross-company-duplicates.csv`);

  // Group by companies involved → likely company-merge candidates
  const companyPairs = new Map();
  for (const cluster of crossCompanyClusters) {
    const cIds = [...new Set(cluster.map(c => c.companyId))].sort((a, b) => a - b);
    const key = cIds.join("+");
    companyPairs.set(key, (companyPairs.get(key) || 0) + 1);
  }
  console.log("\nCompany pairs sharing duplicate contacts (likely candidate for company merge):");
  for (const [k, n] of [...companyPairs].sort((a, b) => b[1] - a[1])) {
    const ids = k.split("+");
    const names = await conn.query(`SELECT id, name FROM companies WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    const labels = names[0].map(c => `${c.id}=${c.name}`).join(" ↔ ");
    console.log(`  ${n} shared contacts: ${labels}`);
  }

  await conn.end();
  console.log(APPLY ? "\n✅ Applied changes to DB." : "\n💡 Run with --apply to write changes.");
}

main().catch(err => { console.error(err); process.exit(1); });
