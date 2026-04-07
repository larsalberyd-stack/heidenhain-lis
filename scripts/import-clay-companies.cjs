const fs = require("fs");
const mysql = require("mysql2/promise");

const CSV_PATH = "/Users/larsalberyd/Downloads/clay-import-Default-view-export-1775590817668.csv";

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field.trim()); field = ""; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field.trim());
        field = "";
        if (current.length > 1 || current[0]) rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length) { current.push(field.trim()); rows.push(current); }
  return rows;
}

async function main() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const allRows = parseCSV(raw);
  const headers = allRows[0];
  console.log("Headers:", headers.slice(0, 10), "...");

  const col = (row, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (row[idx] || "").trim() : "";
  };

  // Filter to rows that have a Company Name
  const dataRows = allRows.slice(1).filter(r => col(r, "Company Name"));
  console.log(`\nParsed ${dataRows.length} companies from Clay.\n`);

  const conn = await mysql.createConnection(
    "mysql://root:Heidenhain2026@localhost:3306/heidenhain_lis"
  );

  // First, clean up broken rows from previous failed import
  await conn.execute("DELETE FROM companies WHERE name LIKE '%ABB operates%' OR name LIKE '%ABBNG was%' OR name LIKE '%With deep engineering%'");

  let created = 0;
  let updated = 0;
  let skippedNoDomain = 0;

  for (const row of dataRows) {
    const companyName = col(row, "Company Name");
    const domain = col(row, "Domain").toLowerCase();
    const market = col(row, "Market");
    const category = col(row, "Category");
    const application = col(row, "Application");
    const city = col(row, "City");
    const country = col(row, "Country");
    const focus = col(row, "Focus");
    const knownContact = col(row, "Known Contact");
    const knownContactTitle = col(row, "Known Contact Title");
    const comments = col(row, "Comments");
    const website = col(row, "Website");
    const empStr = col(row, "Employee Count");
    const employeeCount = empStr ? parseInt(empStr.replace(/,/g, "")) || null : null;
    const size = col(row, "Size");
    const industry = col(row, "Industry");
    const description = col(row, "Description");
    const linkedinUrl = col(row, "Url");
    const foundedStr = col(row, "Founded");
    const foundedYear = foundedStr ? parseInt(foundedStr) || null : null;
    const logoUrl = col(row, "Logo Url");

    if (!domain) {
      console.log(`  [skip] ${companyName} — ingen domän`);
      skippedNoDomain++;
      continue;
    }

    // Build category string, truncate to 255
    const fullCategory = [market, category, application].filter(Boolean).join(" - ").substring(0, 255);
    const notes = [knownContact, knownContactTitle, comments].filter(Boolean).join(" | ").substring(0, 1000);

    // Check if company exists by domain
    const [existing] = await conn.execute(
      "SELECT id FROM companies WHERE domain = ? LIMIT 1",
      [domain]
    );

    if (existing.length > 0) {
      await conn.execute(
        `UPDATE companies SET
          name = ?,
          category = ?,
          focus = COALESCE(NULLIF(?, ''), focus),
          city = COALESCE(NULLIF(?, ''), city),
          country = COALESCE(NULLIF(?, ''), country),
          description = COALESCE(NULLIF(?, ''), description),
          industry = COALESCE(NULLIF(?, ''), industry),
          employeeCount = COALESCE(?, employeeCount),
          employeeRange = COALESCE(NULLIF(?, ''), employeeRange),
          linkedinUrl = COALESCE(NULLIF(?, ''), linkedinUrl),
          websiteUrl = COALESCE(NULLIF(?, ''), websiteUrl),
          logoUrl = COALESCE(NULLIF(?, ''), logoUrl),
          foundedYear = COALESCE(?, foundedYear),
          notes = COALESCE(NULLIF(?, ''), notes),
          source = 'clay',
          updatedAt = NOW()
        WHERE id = ?`,
        [
          companyName, fullCategory, focus, city, country,
          description, industry, employeeCount, size,
          linkedinUrl, website, logoUrl, foundedYear, notes,
          existing[0].id
        ]
      );
      updated++;
      console.log(`  [updated] ${companyName} (${domain})`);
    } else {
      await conn.execute(
        `INSERT INTO companies
          (name, domain, category, focus, source, city, country,
           description, industry, employeeCount, employeeRange,
           linkedinUrl, websiteUrl, logoUrl, foundedYear, notes,
           status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'clay', ?, ?,
                 ?, ?, ?, ?,
                 ?, ?, ?, ?, ?,
                 'new', NOW(), NOW())`,
        [
          companyName, domain, fullCategory, focus || null, city, country,
          description, industry, employeeCount, size,
          linkedinUrl, website, logoUrl, foundedYear, notes
        ]
      );
      created++;
      console.log(`  [created] ${companyName} (${domain})`);
    }
  }

  // Summary
  const [totalCompanies] = await conn.execute("SELECT COUNT(*) as c FROM companies");
  const [totalContacts] = await conn.execute("SELECT COUNT(*) as c FROM contacts");
  const [companiesWithContacts] = await conn.execute(
    "SELECT COUNT(DISTINCT companyId) as c FROM contacts"
  );

  console.log(`\n=== Import klar ===`);
  console.log(`Företag skapade: ${created}`);
  console.log(`Företag uppdaterade: ${updated}`);
  console.log(`Hoppade över (ingen domän): ${skippedNoDomain}`);
  console.log(`\n=== Databas totalt ===`);
  console.log(`Totalt företag: ${totalCompanies[0].c}`);
  console.log(`Totalt kontakter: ${totalContacts[0].c}`);
  console.log(`Företag med kontakter: ${companiesWithContacts[0].c}`);
  console.log(`Företag UTAN kontakter (behöver Find People): ${totalCompanies[0].c - companiesWithContacts[0].c}`);

  // List companies without contacts
  const [noContacts] = await conn.execute(`
    SELECT c.id, c.name, c.domain, c.focus
    FROM companies c
    LEFT JOIN contacts ct ON ct.companyId = c.id
    WHERE ct.id IS NULL
    ORDER BY FIELD(c.focus, 'AAA', 'AA', 'A', 'B', 'C', ''), c.name
  `);

  console.log(`\n=== Företag utan kontakter ===`);
  for (const c of noContacts) {
    console.log(`  [${c.focus || '-'}] ${c.name} (${c.domain})`);
  }

  await conn.end();
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
