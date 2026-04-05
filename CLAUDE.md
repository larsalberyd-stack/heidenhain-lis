# Heidenhain Lead Intelligence System (LIS)

## Project Overview

AI-driven sales steering tool for Heidenhain Scandinavia AB — from prospect list to verified decision-makers, weekly lists, and systematic follow-up. Built by 7C Group AB.

**Client:** Heidenhain Scandinavia AB — Per Wincent, Managing Director Nordics & Baltics
**Vendor:** 7C Group AB — Lars Alberyd
**Contract signed:** 2026-03-20
**Contract ID:** 7CG-2026-HEI-01
**Referenskund:** Yes — Heidenhain gets all future features at no extra cost during contract period.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Backend:** Express + tRPC
- **Database:** MySQL / TiDB Serverless (via Drizzle ORM)
- **Enrichment:** Clay API (Pro plan) + Clay webhooks
- **Automation:** Make.com (webhook-triggered workflows)
- **Maps:** Google Maps JS API (via proxy)
- **Analytics:** Umami (privacy-focused)
- **Testing:** Vitest

---

## BLOCKING DEPENDENCIES — MUST FIX FIRST

These two integrations are hardcoded to Manus infrastructure and will NOT work outside Manus.

### 1. LLM Provider (BLOCKER)
- **Current:** Forge API at `forge.manus.im` using `gemini-2.5-flash`
- **Problem:** This is Manus's private proxy. It will stop working.
- **Fix:** Replace with Anthropic Claude API (`api.anthropic.com`) or OpenAI API
- **Files to change:** `server/_core/llm.ts`, `server/_core/env.ts`
- **Env vars:** Replace `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` with `ANTHROPIC_API_KEY`

### 2. Authentication (BLOCKER)
- **Current:** OAuth via `WebDevAuthPublicService` (Manus OAuth provider)
- **Problem:** This OAuth server is Manus infrastructure. Users cannot log in without it.
- **Fix:** Replace with own auth solution — options: Auth0, Clerk, NextAuth, or simple JWT-based email/password
- **Files to change:** `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/_core/env.ts`, `client/src/_core/hooks/useAuth.ts`
- **Env vars:** Replace `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`

### 3. Maps Proxy (MINOR)
- **Current:** Google Maps loaded via `forge.butterfly-effect.dev` proxy
- **Fix:** Replace with direct Google Maps API key or remove maps feature for now
- **Files:** `client/src/components/Map.tsx`

---

## Business Context

Heidenhain manufactures precision measurement and control systems: absolute encoders, linear encoders, digital readouts (DRO), CNC controls (TNC series), and length gauges. Their Nordic sales team of 3 reps needs a structured prospecting system.

**Core problem:** 87+ prospect companies identified. Need to find decision-makers, score/prioritize accounts, and track all sales activity systematically.

**Market segments:**
- Marine: 38 companies (shipbuilders, engine manufacturers, system integrators)
- Heavy Duty: 25 companies
- Automation: 9 companies
- Oil & Gas: 5 companies
- Mining: 4 companies
- Medical: 3 companies
- Other: Forestry, Motors, Electronics

**Geographic coverage:** Finland (34), Sweden (29), Norway (22), Denmark (2)

**Decision-maker targets (two tracks):**

Technology titles: CTO, VP Technology, VP R&D, Technical Manager, R&D Manager, Design Manager, Engineering Manager, Lead Engineer, System Architect, Director Engineering, Director R&D

Procurement titles: CPO, VP Procurement/Purchasing/Supply Chain, Purchasing/Procurement Manager, Category Manager

---

## Database Schema (MySQL / TiDB — Drizzle ORM)

### users
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| openId | varchar(64) | UNIQUE, from OAuth |
| name | text | |
| email | varchar(320) | |
| role | enum('user','admin') | admin = FC/Säljchef, user = Säljare |
| createdAt | timestamp | |
| lastSignedIn | timestamp | |

### companies
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| name | varchar(255) | |
| domain | varchar(255) | Website URL for Clay lookup |
| category | varchar(255) | e.g. Manufacturer - Systems |
| focus | varchar(10) | AAA, AA, A, B, C |
| city | varchar(100) | |
| country | varchar(100) | |
| description | text | |
| industry | varchar(255) | |
| employeeCount | int | |
| employeeRange | varchar(50) | |
| linkedinUrl | varchar(500) | |
| websiteUrl | varchar(500) | |
| status | enum('new','contacted','meeting','qualified','lost') | Pipeline stage |
| assignedTo | varchar(255) | |
| assignedToUserId | int | FK to users |
| assignedToName | varchar(255) | |
| weeklyListId | int | FK to weekly_assignments |
| enrichedAt | timestamp | When Clay data was last synced |

### contacts
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| companyId | int | FK to companies |
| firstName | varchar(100) | |
| lastName | varchar(100) | |
| fullName | varchar(255) | |
| title | varchar(255) | Job title |
| seniority | varchar(100) | |
| department | varchar(100) | |
| email | varchar(320) | |
| emailVerified | boolean | |
| phone | varchar(50) | |
| linkedinUrl | varchar(500) | |
| priority | enum('high','medium','low') | |

### activities
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| companyId | int | FK |
| contactId | int | FK (optional) |
| type | enum('email_sent','email_opened','email_replied','meeting_booked','call','note') | |
| description | text | |
| performedBy | varchar(255) | |
| createdAt | timestamp | |

### generated_emails
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| companyId | int | FK |
| contactId | int | FK (optional) |
| subject | text | |
| body | text | AI-generated |
| editedBody | text | User-edited version |
| status | enum('draft','sent','opened','replied') | |
| generatedBy | varchar(255) | |

### weekly_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| assignedToUserId | int | FK to users |
| assignedToName | varchar(255) | |
| weekLabel | varchar(50) | e.g. "2026-W09" |
| createdByUserId | int | FK to users (admin who created) |

### webhook_logs
| Column | Type | Notes |
|--------|------|-------|
| id | int AUTO_INCREMENT | PK |
| source | varchar(50) | default 'clay' |
| payload | text | Raw webhook JSON |
| status | enum('success','error','partial') | |
| companiesCreated | int | |
| contactsCreated | int | |

---

## Current Data in Database

- 100 companies imported (from 109 in Clay — 98% enrichment rate)
- 293 contacts imported (241 with verified emails)
- Focus distribution: AAA (26), AA (15), A (4), Unclassified (42+)

---

## Build Status — Honest Assessment

### WORKING (production-ready)
- [x] Full React + TypeScript + tRPC application (~185 files)
- [x] Dashboard with company list, priority badges (AAA/AA/A/B/C), status indicators
- [x] Filtering by priority, status, and free-text search
- [x] Default sort by priority (AAA first)
- [x] Company detail page with contacts and activity history
- [x] Role-based access: Admin/FC sees everything, Säljare sees only assigned companies
- [x] Weekly list assignment — admin creates weekly lists, assigns companies to reps
- [x] Activity logging per company (calls, emails, meetings, notes with timestamps)
- [x] AI email generation — hypothesis-driven, 150-180 words, Swedish + English
- [x] Email editing, copy to clipboard, open in mail client
- [x] CSV import from Clay exports
- [x] Clay webhook endpoint (receives enriched data via HTTP POST)
- [x] Account status tracking: Ny → Kontaktad → Möte bokat → Kvalificerad → Förlorad
- [x] Add Company modal with validation
- [x] LinkedIn links for companies and contacts
- [x] Swedish UI labels throughout (FC/Säljchef, Säljare, etc.)

### PARTIALLY BUILT (code exists but not active)
- [ ] Clay REST API outbound integration (`server/clay.ts`) — can push companies to Clay and fetch enriched data, but currently bypassed in favor of CSV import
- [ ] Make.com webhook trigger (`server/makecom.ts`) — module exists, not wired to frontend
- [ ] Python enrichment scripts (`free_enrichment_service.py`, `multi_source_enrichment.py`) — experimental Apollo/LinkedIn scrapers, not integrated into Node.js backend

### NOT BUILT
- [ ] Account scoring engine (0-100 points based on firmographics, technographics, buying signals, engagement)
- [ ] Trigger detection (electrification, hiring, expansion, partnerships)
- [ ] Qualifying questions generation (per company, for follow-up calls)
- [ ] Feedback loop (outcome tracking → scoring model refinement)
- [ ] Conversion analytics (by segment, trigger, role)
- [ ] Reporting dashboard (management-level)
- [ ] Mobilnummer-integration (Lusha/Apollo buttons per contact)
- [ ] Daily prioritized outreach list generation
- [ ] Contact detail page with full history

---

## Clay Integration Details

**Clay table:** "Heidenhain Marine Prospects"
**Current integration methods:**
1. CSV export from Clay → import via admin UI (WORKING)
2. Clay webhook → app endpoint `/api/trpc/webhook.clay` (WORKING)
3. Clay REST API → push/pull data programmatically (CODE EXISTS, NOT ACTIVE)

**Enrichment pipeline configured in Clay (waterfall):**
1. Company enrichment: Clearbit → Apollo → Hunter → LinkedIn
2. Find decision-makers: Apollo People Search (5 per company)
3. Role classification: AI column → Technical / Business / Procurement
4. Triggers: Google News + AI extraction
5. Entry angles: AI-generated sales arguments per company
6. Qualifying questions: AI-generated, 3-5 per company

---

## Scoring Model (TO BE IMPLEMENTED)

**Points (0-100 total):**
- Firmographic fit (size, industry, location): 0-25
- Technographic fit (tech stack, compatibility): 0-25
- Buying signals (funding, expansion, new hires): 0-25
- Engagement (website visits, email opens): 0-25

**Tiers:**
- A-leads: 75+ points
- B-leads: 50-74 points
- C-leads: 25-49 points
- Disqualified: <25 points

---

## Implementation Priority

### Phase 0: Remove Manus Dependencies (CRITICAL — do this first)
1. Replace LLM provider: `forge.manus.im` → Anthropic Claude API
2. Replace OAuth: Manus OAuth → own auth solution (Clerk, Auth0, or simple JWT)
3. Replace Maps proxy → direct Google Maps API key or remove

### Phase 1: Activate Clay API Integration
4. Wire up `server/clay.ts` to frontend — enable real-time data pull instead of CSV-only
5. Set up automated Clay sync (daily or on-demand)

### Phase 2: Build Scoring Engine
6. Design scoring weights with client (Per Wincent)
7. Implement scoring algorithm in backend
8. Add score display to dashboard and company detail pages

### Phase 3: Build Missing Features
9. Qualifying questions generator (AI-driven, per company)
10. Trigger detection and alert system
11. Lusha/Apollo buttons for mobile number lookup
12. Contact detail page with full history

### Phase 4: Feedback Loop & Analytics
13. Outcome tracking (email sent → opened → replied → meeting → won/lost)
14. Conversion analytics dashboard
15. Scoring model refinement based on actual conversion data

### Phase 5: Production Deployment
16. Set up hosting (Azure or AWS Frankfurt, EU)
17. Configure PostgreSQL or MySQL production database
18. Set up GitHub CI/CD pipeline
19. SSL, backups, monitoring

---

## Key Project Files

| File | Purpose |
|------|---------|
| `server/_core/llm.ts` | LLM integration — NEEDS REPLACEMENT |
| `server/_core/oauth.ts` | Auth — NEEDS REPLACEMENT |
| `server/_core/sdk.ts` | Auth SDK — NEEDS REPLACEMENT |
| `server/_core/env.ts` | All environment variable definitions |
| `server/clay.ts` | Clay API integration (push/pull) |
| `server/makecom.ts` | Make.com webhook triggers |
| `server/routers.ts` | All tRPC API routes (17KB, main backend logic) |
| `server/db.ts` | Database connection and queries (12KB) |
| `server/storage.ts` | Data access layer |
| `client/src/components/DashboardLayout.tsx` | Main dashboard UI |
| `client/src/components/AIChatBox.tsx` | AI email generation UI |
| `client/src/App.tsx` | App router and layout |
| `database_schema_full.sql` | Complete DB schema (6 tables) |
| `todo.md` | Original Manus roadmap |

---

## Environment Variables Required

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database_name

# Authentication (REPLACE — Manus OAuth will not work)
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://your-auth-provider.com
JWT_SECRET=your-jwt-secret-key
OWNER_OPEN_ID=openid-of-initial-admin-user

# LLM (REPLACE — forge.manus.im will not work)
# Option A: Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
# Option B: OpenAI
OPENAI_API_KEY=sk-xxxxx

# Clay
CLAY_API_KEY=clay_xxxxx
CLAY_TABLE_ID=tbl_xxxxx

# Make.com
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-webhook-path

# Frontend
VITE_OAUTH_PORTAL_URL=https://your-auth-portal.com
VITE_FRONTEND_FORGE_API_URL=https://your-maps-proxy.com
VITE_FRONTEND_FORGE_API_KEY=your-key
VITE_ANALYTICS_ENDPOINT=https://your-analytics.com
VITE_ANALYTICS_WEBSITE_ID=your-id
```

---

## Development Rules

- All UI text in Swedish (system is for Swedish/Nordic sales team)
- AI prompts can be in English (better LLM output quality)
- Mobile-responsive design required (reps use phones in field)
- All data belongs to Heidenhain — full export (CSV/JSON) must be possible
- Source code must be deliverable to client on contract termination
- EU hosting only (GDPR compliance, AWS Frankfurt or Azure West Europe)
- Support SLA: bug fixes within 1 business day

---

## Contracted Pricing (for reference)

- Implementation fee: 22,500 SEK (7C Group AB)
- Workshop fee: 22,500 SEK (SalesStar Scandinavia AB)
- Monthly fee: 5,900 SEK/month (after approved pilot)
- Total year 1 estimate: 115,800 SEK
