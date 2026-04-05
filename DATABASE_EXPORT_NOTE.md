# Database Export Note

## Current State

The application uses a **remote MySQL/TiDB Serverless** database configured via the `DATABASE_URL` environment variable. The database credentials are not stored in the repository (no `.env` file is committed, which is correct security practice).

## What Is Included

1. **`database_schema_full.sql`** — The complete database schema reconstructed from the three Drizzle ORM migration files. This can be used to recreate the database structure from scratch.

2. **`client/src/data/companies.json`** — A static JSON file containing 6 seed/demo companies with rich data (triggers, decision makers, entry angles, qualifying questions). This appears to be an early prototype dataset, not the production data.

## Known Production Data (per git history and todo.md)

According to commit messages and the project's own documentation:

- **~100 companies** imported from Clay CSV exports
- **~293 contacts** (241 with verified emails) imported from Clay CSV exports
- Multiple AI-generated email drafts
- Activity logs and webhook logs

## How to Export Live Data

To dump the production database, you need the `DATABASE_URL` from the deployment environment. Then run:

```bash
# Option 1: mysqldump (if MySQL client is available)
mysqldump -h <host> -u <user> -p<password> --port=<port> <database_name> > production_dump.sql

# Option 2: Use the app's own tRPC API endpoints
# GET /api/trpc/companies.list — returns all companies as JSON
# GET /api/trpc/contacts.all — returns all contacts as JSON
```

## Tables in the Database

| Table | Description | Estimated Rows |
|-------|-------------|----------------|
| `users` | Authenticated users (admin/salesperson) | ~5-10 |
| `companies` | OEM prospect companies | ~100 |
| `contacts` | Decision makers at companies | ~293 |
| `generated_emails` | AI-generated prospecting emails | Unknown |
| `activities` | Activity log (calls, emails, meetings) | Unknown |
| `webhook_logs` | Clay webhook ingestion logs | Unknown |
| `weekly_assignments` | Weekly company assignment lists | Unknown |
