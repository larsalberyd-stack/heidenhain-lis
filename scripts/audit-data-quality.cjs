const mysql = require("mysql2/promise");
require("dotenv").config();

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== TOTALS ===");
  const [[totals]] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM companies) AS companies,
      (SELECT COUNT(*) FROM contacts) AS contacts,
      (SELECT COUNT(*) FROM contacts WHERE email IS NOT NULL AND email != '') AS contacts_with_email,
      (SELECT COUNT(*) FROM contacts WHERE phone IS NOT NULL AND phone != '') AS contacts_with_phone,
      (SELECT COUNT(*) FROM activities) AS activities
  `);
  console.log(totals);

  console.log("\n=== COMPANY COUNTRY DISTRIBUTION ===");
  const [companyCountries] = await conn.query(`
    SELECT country, COUNT(*) AS n FROM companies GROUP BY country ORDER BY n DESC
  `);
  console.table(companyCountries);

  console.log("\n=== CONTACT LOCATION DISTRIBUTION (TOP 20) ===");
  const [contactLocations] = await conn.query(`
    SELECT location, COUNT(*) AS n FROM contacts WHERE location IS NOT NULL AND location != ''
    GROUP BY location ORDER BY n DESC LIMIT 20
  `);
  console.table(contactLocations);

  console.log("\n=== COUNTRY MISMATCH SAMPLES ===");
  console.log("Contacts whose location doesn't contain the company's country:");
  const [mismatches] = await conn.query(`
    SELECT c.id, c.fullName, c.title, c.location AS contact_location,
           co.name AS company, co.country AS company_country
    FROM contacts c
    JOIN companies co ON c.companyId = co.id
    WHERE c.location IS NOT NULL AND c.location != ''
      AND co.country IS NOT NULL AND co.country != ''
      AND c.location NOT LIKE CONCAT('%', co.country, '%')
    ORDER BY co.name, c.fullName
    LIMIT 25
  `);
  console.table(mismatches);

  const [[mismatchCount]] = await conn.query(`
    SELECT COUNT(*) AS n FROM contacts c
    JOIN companies co ON c.companyId = co.id
    WHERE c.location IS NOT NULL AND c.location != ''
      AND co.country IS NOT NULL AND co.country != ''
      AND c.location NOT LIKE CONCAT('%', co.country, '%')
  `);
  console.log(`\nTotal contacts with country mismatch: ${mismatchCount.n}`);

  console.log("\n=== TOP 30 CONTACT TITLES ===");
  const [titles] = await conn.query(`
    SELECT title, COUNT(*) AS n FROM contacts WHERE title IS NOT NULL AND title != ''
    GROUP BY title ORDER BY n DESC LIMIT 30
  `);
  console.table(titles);

  console.log("\n=== TARGET-TITLE MATCH RATE ===");
  const targetKeywords = [
    "CTO", "VP Technology", "VP R&D", "Technical Manager", "R&D Manager",
    "Design Manager", "Engineering Manager", "Lead Engineer", "System Architect",
    "Director Engineering", "Director R&D",
    "CPO", "VP Procurement", "VP Purchasing", "VP Supply Chain",
    "Purchasing Manager", "Procurement Manager", "Category Manager"
  ];
  const likeClauses = targetKeywords.map(k => `title LIKE '%${k}%'`).join(" OR ");
  const [[targetMatch]] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM contacts WHERE ${likeClauses}) AS matching_target,
      (SELECT COUNT(*) FROM contacts WHERE title IS NOT NULL AND title != '') AS with_title
  `);
  console.log(targetMatch);
  const pct = ((targetMatch.matching_target / targetMatch.with_title) * 100).toFixed(1);
  console.log(`${targetMatch.matching_target}/${targetMatch.with_title} (${pct}%) match target keywords`);

  console.log("\n=== ACTIVITY BREAKDOWN ===");
  const [activityTypes] = await conn.query(`
    SELECT type, COUNT(*) AS n FROM activities GROUP BY type ORDER BY n DESC
  `);
  console.table(activityTypes);

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
