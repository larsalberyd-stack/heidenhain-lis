const fs = require("fs");
const mysql = require("mysql2/promise");

const CSV_PATH = "/Users/larsalberyd/Desktop/Senior-Tech-Management-Nordic-Default-view-export-1775590408708.csv";

async function main() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim());

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log("Headers:", headers);

  // Parse rows — skip empty ones
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || "").trim(); });
    // Only keep rows with a name and domain
    if (row["Full Name"] && row["Company Domain"]) {
      rows.push(row);
    }
  }

  console.log(`\nParsed ${rows.length} contacts with data.\n`);

  // Extract unique companies by domain
  const companyMap = new Map();
  for (const row of rows) {
    const domain = row["Company Domain"].toLowerCase();
    if (!companyMap.has(domain)) {
      // Derive company name from domain (capitalize first part)
      const domainName = domain.split(".")[0];
      const companyName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      companyMap.set(domain, { domain, name: companyName, contacts: [] });
    }
    companyMap.get(domain).contacts.push(row);
  }

  console.log(`Found ${companyMap.size} unique companies:\n`);
  for (const [domain, data] of companyMap) {
    console.log(`  ${data.name} (${domain}) — ${data.contacts.length} kontakter`);
  }

  // Connect to database
  const conn = await mysql.createConnection(
    "mysql://root:Heidenhain2026@localhost:3306/heidenhain_lis"
  );

  let companiesCreated = 0;
  let contactsCreated = 0;
  let contactsUpdated = 0;

  for (const [domain, data] of companyMap) {
    // Check if company exists
    const [existing] = await conn.execute(
      "SELECT id FROM companies WHERE domain = ? LIMIT 1",
      [domain]
    );

    let companyId;
    if (existing.length > 0) {
      companyId = existing[0].id;
      console.log(`  [exists] ${data.name} (id=${companyId})`);
    } else {
      const [result] = await conn.execute(
        `INSERT INTO companies (name, domain, status, createdAt, updatedAt)
         VALUES (?, ?, 'new', NOW(), NOW())`,
        [data.name, domain]
      );
      companyId = result.insertId;
      companiesCreated++;
      console.log(`  [created] ${data.name} (id=${companyId})`);
    }

    // Import contacts
    for (const contact of data.contacts) {
      const email = contact["Work Email (2)"] || null;
      const phone = contact["Mobile Phone"] || null;
      const firstName = contact["First Name"] || null;
      const lastName = contact["Last Name"] || null;
      const fullName = contact["Full Name"] || null;
      const title = contact["Job Title"] || null;
      const location = contact["Location"] || null;
      const linkedin = contact["LinkedIn Profile"] || null;

      // Check if contact exists (by email + company)
      if (email) {
        const [existingContact] = await conn.execute(
          "SELECT id FROM contacts WHERE companyId = ? AND email = ? LIMIT 1",
          [companyId, email]
        );

        if (existingContact.length > 0) {
          // Update existing
          await conn.execute(
            `UPDATE contacts SET
              firstName = COALESCE(?, firstName),
              lastName = COALESCE(?, lastName),
              fullName = COALESCE(?, fullName),
              title = COALESCE(?, title),
              phone = COALESCE(?, phone),
              linkedinUrl = COALESCE(?, linkedinUrl),
              location = COALESCE(?, location),
              updatedAt = NOW()
            WHERE id = ?`,
            [firstName, lastName, fullName, title, phone, linkedin, location, existingContact[0].id]
          );
          contactsUpdated++;
          continue;
        }
      }

      // Insert new contact
      await conn.execute(
        `INSERT INTO contacts
          (companyId, firstName, lastName, fullName, title, email, emailVerified, phone, linkedinUrl, location, priority, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'high', NOW(), NOW())`,
        [companyId, firstName, lastName, fullName, title, email, email ? 1 : 0, phone, linkedin, location]
      );
      contactsCreated++;
    }
  }

  console.log(`\n=== Import klar ===`);
  console.log(`Företag skapade: ${companiesCreated}`);
  console.log(`Kontakter skapade: ${contactsCreated}`);
  console.log(`Kontakter uppdaterade: ${contactsUpdated}`);

  await conn.end();
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
