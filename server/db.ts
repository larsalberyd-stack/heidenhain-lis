import { eq, like, or, desc, and, sql, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, companies, contacts, generatedEmails, activities, webhookLogs, weeklyAssignments,
  InsertCompany, InsertContact, InsertGeneratedEmail,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ─── Companies ───────────────────────────────────────────────────────────────
export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];
  // Only show companies that have at least one contact
  return db.select().from(companies)
    .where(sql`${companies.id} IN (SELECT DISTINCT companyId FROM contacts)`)
    .orderBy(
      sql`FIELD(${companies.focus}, 'AAA', 'AA', 'A', 'B', 'C', '')`,
      companies.name
    );
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0] ?? null;
}

export async function searchCompanies(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(
    or(like(companies.name, `%${query}%`), like(companies.city, `%${query}%`), like(companies.category, `%${query}%`), like(companies.domain, `%${query}%`))
  );
}

export async function upsertCompany(data: InsertCompany): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.domain && data.domain !== "UNABLE_TO_FIND") {
    const existing = await db.select().from(companies).where(eq(companies.domain, data.domain)).limit(1);
    if (existing.length > 0) {
      await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, existing[0].id));
      return existing[0].id;
    }
  }
  const result = await db.insert(companies).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function updateCompanyStatus(id: number, status: "new" | "contacted" | "meeting" | "qualified" | "lost", assignedTo?: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set({ status, ...(assignedTo !== undefined ? { assignedTo } : {}), ...(notes !== undefined ? { notes } : {}), updatedAt: new Date() }).where(eq(companies.id, id));
}

export async function assignCompanyToUser(companyId: number, userId: number | null, userName: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set({ assignedToUserId: userId, assignedToName: userName, updatedAt: new Date() }).where(eq(companies.id, companyId));
}

export async function getCompaniesByAssignedUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(eq(companies.assignedToUserId, userId)).orderBy(
    sql`FIELD(focus, 'AAA', 'AA', 'A', 'B', 'C', '')`,
    companies.name
  );
}

// Returns companies where the user is assigned OR has logged any activity OR generated any email.
// `engagementMatches` array holds candidate strings (user.name, user.email) to match against
// activities.performedBy / generated_emails.generatedBy (both varchar, populated from frontend).
export async function getCompaniesByUserEngagement(userId: number, engagementMatches: string[]) {
  const db = await getDb();
  if (!db) return [];
  const matches = engagementMatches.filter(s => s && s.trim().length > 0);

  // Build subquery for engagement-based companyIds. Fall back to assigned-only if no matches.
  const conditions = [eq(companies.assignedToUserId, userId)];
  if (matches.length > 0) {
    const activityCompanyIds = db.select({ id: activities.companyId }).from(activities)
      .where(sql`${activities.performedBy} IN (${sql.join(matches.map(m => sql`${m}`), sql`, `)})`);
    const emailCompanyIds = db.select({ id: generatedEmails.companyId }).from(generatedEmails)
      .where(sql`${generatedEmails.generatedBy} IN (${sql.join(matches.map(m => sql`${m}`), sql`, `)})`);
    conditions.push(sql`${companies.id} IN ${activityCompanyIds}` as any);
    conditions.push(sql`${companies.id} IN ${emailCompanyIds}` as any);
  }
  const rows = await db.select().from(companies).where(or(...conditions)).orderBy(
    sql`FIELD(focus, 'AAA', 'AA', 'A', 'B', 'C', '')`,
    companies.name
  );

  // Annotate each row with how the user is connected. Cheap second pass: query activity counts.
  if (matches.length === 0 || rows.length === 0) {
    return rows.map(r => ({ ...r, isAssigned: r.assignedToUserId === userId, hasOwnActivity: false }));
  }
  const ids = rows.map(r => r.id);
  const [acts] = await db.execute(sql`
    SELECT companyId, COUNT(*) AS n FROM activities
    WHERE performedBy IN (${sql.join(matches.map(m => sql`${m}`), sql`, `)})
      AND companyId IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})
    GROUP BY companyId
  `);
  const [emails] = await db.execute(sql`
    SELECT companyId, COUNT(*) AS n FROM generated_emails
    WHERE generatedBy IN (${sql.join(matches.map(m => sql`${m}`), sql`, `)})
      AND companyId IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})
    GROUP BY companyId
  `);
  const activityMap = new Map<number, number>();
  for (const r of acts as unknown as { companyId: number; n: number }[]) activityMap.set(r.companyId, Number(r.n));
  const emailMap = new Map<number, number>();
  for (const r of emails as unknown as { companyId: number; n: number }[]) emailMap.set(r.companyId, Number(r.n));
  return rows.map(r => ({
    ...r,
    isAssigned: r.assignedToUserId === userId,
    hasOwnActivity: (activityMap.get(r.id) ?? 0) > 0 || (emailMap.get(r.id) ?? 0) > 0,
    ownActivityCount: (activityMap.get(r.id) ?? 0) + (emailMap.get(r.id) ?? 0),
  }));
}

export async function getUnassignedCompanies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(isNull(companies.assignedToUserId)).orderBy(
    sql`FIELD(focus, 'AAA', 'AA', 'A', 'B', 'C', '')`,
    companies.name
  );
}

// ─── Contacts ────────────────────────────────────────────────────────────────
export async function getContactsByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts).where(eq(contacts.companyId, companyId));
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function upsertContact(data: InsertContact): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.email) {
    const existing = await db.select().from(contacts).where(and(eq(contacts.companyId, data.companyId), eq(contacts.email, data.email))).limit(1);
    if (existing.length > 0) {
      await db.update(contacts).set({ ...data, updatedAt: new Date() }).where(eq(contacts.id, existing[0].id));
      return existing[0].id;
    }
  }
  const result = await db.insert(contacts).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function getAllContacts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts).orderBy(contacts.companyId, contacts.fullName);
}

export async function updateContactPhone(contactId: number, phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contacts).set({ phone, updatedAt: new Date() }).where(eq(contacts.id, contactId));
  const result = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  return result[0] ?? null;
}

// ─── Generated Emails ────────────────────────────────────────────────────────
export async function getEmailsByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedEmails).where(eq(generatedEmails.companyId, companyId)).orderBy(desc(generatedEmails.createdAt));
}

export async function saveGeneratedEmail(data: InsertGeneratedEmail): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generatedEmails).values(data);
  return Number((result as any).insertId ?? 0);
}

export async function updateEmailStatus(id: number, status: "draft" | "sent" | "opened" | "replied", editedBody?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generatedEmails).set({ status, ...(editedBody !== undefined ? { editedBody } : {}), updatedAt: new Date() }).where(eq(generatedEmails.id, id));
}

// ─── Activities ──────────────────────────────────────────────────────────────
export async function getActivitiesByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).where(eq(activities.companyId, companyId)).orderBy(desc(activities.createdAt));
}

export async function addActivity(data: { companyId: number; contactId?: number; type: "email_sent" | "email_opened" | "email_replied" | "meeting_booked" | "call" | "note"; description?: string; performedBy?: string; }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activities).values(data);
}

// ─── Webhook Logs ────────────────────────────────────────────────────────────
export async function logWebhook(data: { source?: string; payload?: string; status: "success" | "error" | "partial"; errorMessage?: string; companiesCreated?: number; contactsCreated?: number; }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookLogs).values(data);
}

// ─── Weekly Assignments ──────────────────────────────────────────────────────
export async function createWeeklyAssignment(data: { assignedToUserId: number; assignedToName: string; weekLabel: string; createdByUserId: number; companyIds: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(weeklyAssignments).values({
    assignedToUserId: data.assignedToUserId,
    assignedToName: data.assignedToName,
    weekLabel: data.weekLabel,
    createdByUserId: data.createdByUserId,
  });
  const weeklyId = Number((result as any).insertId);
  if (data.companyIds.length > 0) {
    for (const cid of data.companyIds) {
      await db.update(companies).set({
        assignedToUserId: data.assignedToUserId,
        assignedToName: data.assignedToName,
        weeklyListId: weeklyId,
        updatedAt: new Date(),
      }).where(eq(companies.id, cid));
    }
  }
  return weeklyId;
}

export async function getWeeklyAssignments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeklyAssignments).orderBy(desc(weeklyAssignments.createdAt));
}

export async function getCompaniesByWeeklyList(weeklyListId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(eq(companies.weeklyListId, weeklyListId)).orderBy(
    sql`FIELD(focus, 'AAA', 'AA', 'A', 'B', 'C', '')`,
    companies.name
  );
}

// ─── Clay Sync ──────────────────────────────────────────────────────────────
export async function getCompaniesForClaySync() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: companies.id,
    name: companies.name,
    domain: companies.domain,
    category: companies.category,
    city: companies.city,
    country: companies.country,
    focus: companies.focus,
    clayRowId: companies.clayRowId,
  }).from(companies).where(isNull(companies.clayRowId)).orderBy(
    sql`FIELD(focus, 'AAA', 'AA', 'A', 'B', 'C', '')`,
    companies.name
  );
}

export async function getCompaniesWithClayRowId() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: companies.id,
    clayRowId: companies.clayRowId,
  }).from(companies);
  return rows.filter((r): r is { id: number; clayRowId: string } => !!r.clayRowId);
}

export async function updateCompanyClayRowId(companyId: number, clayRowId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set({ clayRowId, updatedAt: new Date() }).where(eq(companies.id, companyId));
}

export async function updateCompanyEnrichedData(companyId: number, data: {
  description?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set({
    ...(data.description ? { description: data.description } : {}),
    ...(data.industry ? { industry: data.industry } : {}),
    ...(data.employeeCount ? { employeeCount: data.employeeCount } : {}),
    enrichedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(companies.id, companyId));
}

// ─── Stats ───────────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalCompanies: 0, totalContacts: 0, aaaCount: 0, aaCount: 0, aCount: 0, contactedCount: 0, emailsGenerated: 0 };
  const [companyRows, contactRows, emailRows] = await Promise.all([
    db.select().from(companies).where(sql`${companies.id} IN (SELECT DISTINCT companyId FROM contacts)`),
    db.select({ id: contacts.id }).from(contacts),
    db.select({ id: generatedEmails.id }).from(generatedEmails),
  ]);
  return {
    totalCompanies: companyRows.length,
    totalContacts: contactRows.length,
    aaaCount: companyRows.filter(c => c.focus === "AAA").length,
    aaCount: companyRows.filter(c => c.focus === "AA").length,
    aCount: companyRows.filter(c => c.focus === "A").length,
    contactedCount: companyRows.filter(c => c.status !== "new").length,
    emailsGenerated: emailRows.length,
  };
}
