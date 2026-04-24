// Re-route cross-company duplicate contacts to the company that matches their actual location.
// E.g. Niko Oja sits in Finland but is on Konecranes Lifttrucks (Sweden, Markaryd).
// Konecranes (Finland) exists as a separate entity — Niko should live there.
//
// For pairs where both companies share the same country (e.g. Wärtsilä Thrusters + Wärtsilä,
// both Finnish), we fall back to consolidating to the company with more complete data per contact.
//
// Usage:
//   node scripts/fix-cross-company-routing.cjs           # dry-run
//   node scripts/fix-cross-company-routing.cjs --apply   # write to DB

require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const APPLY = process.argv.includes("--apply");

function detectCountry(loc) {
  if (!loc) return null;
  const l = loc.toLowerCase();
  if (l.includes("sweden") || l.includes("sverige")) return "Sweden";
  if (l.includes("norway") || l.includes("norge")) return "Norway";
  if (l.includes("finland") || l.includes("suomi")) return "Finland";
  if (l.includes("denmark") || l.includes("danmark")) return "Denmark";
  return null;
}

function preferLonger(a, b) { if (!a) return b; if (!b) return a; return a.length >= b.length ? a : b; }
function preferTruthy(a, b) { return a || b; }
function score(c) { return [c.email, c.phone, c.linkedinUrl, c.title, c.location, c.notes].filter(Boolean).length; }

async function main() {
  const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
  console.log(APPLY ? "🚨 APPLY MODE — writing to DB" : "🔍 DRY RUN");

  const [contacts] = await conn.query(`
    SELECT id, companyId, firstName, lastName, fullName, title, seniority, department,
           email, emailVerified, phone, linkedinUrl, location, priority, notes
    FROM contacts ORDER BY id
  `);
  const [allCompanies] = await conn.query(`SELECT id, name, country FROM companies`);
  const companyById = new Map(allCompanies.map(c => [c.id, c]));

  // Group contacts by identity key (email | linkedin | name)
  const norm = s => (s || "").toLowerCase().trim();
  const groups = new Map();
  for (const c of contacts) {
    const keys = new Set();
    if (c.email) keys.add(`email:${norm(c.email)}`);
    if (c.linkedinUrl) keys.add(`li:${norm(c.linkedinUrl)}`);
    if (c.fullName) keys.add(`name:${norm(c.fullName)}`);
    for (const k of keys) {
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
  }

  // Find cross-company clusters (same identity key, multiple companies)
  const seenContactIds = new Set();
  const clusters = [];
  for (const [, arr] of groups) {
    if (arr.length < 2) continue;
    const companyIds = new Set(arr.map(c => c.companyId));
    if (companyIds.size < 2) continue;
    // dedupe by id
    const uniq = arr.filter(c => !seenContactIds.has(c.id));
    if (uniq.length < 2) continue;
    for (const c of uniq) seenContactIds.add(c.id);
    clusters.push(uniq);
  }

  console.log(`\nFound ${clusters.length} cross-company contact clusters\n`);

  let moved = 0, merged = 0, deleted = 0;
  for (const cluster of clusters) {
    const companyIds = [...new Set(cluster.map(c => c.companyId))];
    const companies = companyIds.map(id => companyById.get(id)).filter(Boolean);
    const countries = new Set(companies.map(c => c.country).filter(Boolean));
    const sameCountry = countries.size === 1;

    const personName = cluster[0].fullName || cluster[0].email || `id=${cluster[0].id}`;
    console.log(`\n  ── ${personName}`);
    for (const co of companies) console.log(`     · [${co.id}] ${co.name} (${co.country})`);

    // Determine target company per cluster
    let targetCompanyId;
    if (sameCountry) {
      // No country signal — consolidate to the company already holding the contact with most data
      const winner = [...cluster].sort((a, b) => score(b) - score(a) || a.companyId - b.companyId)[0];
      targetCompanyId = winner.companyId;
      console.log(`     → same country (${[...countries][0]}); consolidating to company ${targetCompanyId}`);
    } else {
      // Country differs — pick by contact location
      const detected = cluster.map(c => detectCountry(c.location)).filter(Boolean);
      const personCountry = detected[0] || null;
      if (!personCountry) {
        // No clue — leave as is
        console.log(`     ! no location signal — skipping (manual review needed)`);
        continue;
      }
      const target = companies.find(co => co.country === personCountry);
      if (!target) {
        console.log(`     ! person in ${personCountry} but no matching company entity — skipping`);
        continue;
      }
      targetCompanyId = target.id;
      console.log(`     → person located in ${personCountry}; routing to company ${targetCompanyId} (${target.name})`);
    }

    // Find existing contact at target (if any) — that becomes canonical
    const atTarget = cluster.filter(c => c.companyId === targetCompanyId);
    const elsewhere = cluster.filter(c => c.companyId !== targetCompanyId);

    if (atTarget.length === 0) {
      // No copy at target yet — pick best from elsewhere, MOVE (update companyId)
      const winner = [...elsewhere].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
      const losers = elsewhere.filter(c => c.id !== winner.id);
      console.log(`     MOVE id=${winner.id} → company ${targetCompanyId}; DELETE losers ids=[${losers.map(l => l.id).join(",")}]`);
      moved++;
      if (APPLY) {
        await conn.execute(`UPDATE contacts SET companyId = ? WHERE id = ?`, [targetCompanyId, winner.id]);
        for (const l of losers) {
          await conn.execute(`UPDATE activities SET contactId = ? WHERE contactId = ?`, [winner.id, l.id]);
          await conn.execute(`UPDATE generated_emails SET contactId = ? WHERE contactId = ?`, [winner.id, l.id]);
          await conn.execute(`DELETE FROM contacts WHERE id = ?`, [l.id]);
          deleted++;
        }
      } else { deleted += losers.length; }
    } else {
      // Pick canonical from atTarget — best data
      const sortedTarget = [...atTarget].sort((a, b) => score(b) - score(a) || a.id - b.id);
      const canonical = sortedTarget[0];
      const targetLosers = sortedTarget.slice(1);
      const allLosers = [...targetLosers, ...elsewhere];

      // Merge fields from all losers into canonical
      const m = { ...canonical };
      for (const l of allLosers) {
        m.firstName = preferLonger(m.firstName, l.firstName);
        m.lastName = preferLonger(m.lastName, l.lastName);
        m.fullName = preferLonger(m.fullName, l.fullName);
        m.title = preferLonger(m.title, l.title);
        m.seniority = preferTruthy(m.seniority, l.seniority);
        m.department = preferTruthy(m.department, l.department);
        m.email = preferTruthy(m.email, l.email);
        m.emailVerified = m.emailVerified || l.emailVerified;
        m.phone = preferTruthy(m.phone, l.phone);
        m.linkedinUrl = preferTruthy(m.linkedinUrl, l.linkedinUrl);
        m.location = preferLonger(m.location, l.location);
        if (!m.notes && l.notes) m.notes = l.notes;
        else if (l.notes && m.notes && !m.notes.includes(l.notes)) m.notes = `${m.notes}\n${l.notes}`;
      }
      console.log(`     MERGE into canonical id=${canonical.id}; DELETE losers ids=[${allLosers.map(l => l.id).join(",")}]`);
      merged++;
      if (APPLY) {
        await conn.execute(
          `UPDATE contacts SET firstName=?, lastName=?, fullName=?, title=?, seniority=?, department=?,
            email=?, emailVerified=?, phone=?, linkedinUrl=?, location=?, notes=? WHERE id=?`,
          [m.firstName, m.lastName, m.fullName, m.title, m.seniority, m.department,
           m.email, m.emailVerified, m.phone, m.linkedinUrl, m.location, m.notes, canonical.id]);
        for (const l of allLosers) {
          await conn.execute(`UPDATE activities SET contactId = ? WHERE contactId = ?`, [canonical.id, l.id]);
          await conn.execute(`UPDATE generated_emails SET contactId = ? WHERE contactId = ?`, [canonical.id, l.id]);
          await conn.execute(`DELETE FROM contacts WHERE id = ?`, [l.id]);
          deleted++;
        }
      } else { deleted += allLosers.length; }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Clusters processed: ${clusters.length}`);
  console.log(`Move-only operations: ${moved}`);
  console.log(`Merge operations: ${merged}`);
  console.log(`Contacts deleted (after merge): ${deleted}`);
  console.log(APPLY ? "\n✅ Applied" : "\n💡 Run with --apply to write");

  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
