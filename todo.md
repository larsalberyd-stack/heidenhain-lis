# Heidenhain OEM Precision Outreach Engine - TODO

## Completed Features
- [x] Basic project structure with React + TypeScript + tRPC
- [x] Database schema for companies, contacts, emails, activities
- [x] Dashboard UI with company list, filters (priority + status + search)
- [x] Add Company modal with form validation
- [x] Clay webhook endpoint for receiving company/contact data
- [x] AI email generation (Swedish + English) with LLM
- [x] Email editing, copy to clipboard, open in mail client
- [x] Import 109 OEM companies from Clay CSV (100 in DB)
- [x] Import 267 contacts (241 with emails) from Clay CSV (293 in DB)
- [x] Dashboard stats (total companies, contacts, AAA+AA count, emails generated)
- [x] Company status management (Ny/Kontaktad/Möte bokat/Kvalificerad/Förlorad)
- [x] Priority badges (AAA/AA/A/B/C) with color coding
- [x] LinkedIn links for companies and contacts
- [x] Company detail page with contacts and AI email generator

## Phase 1: Clay Enrichment & Data Import
- [x] Configure Clay enrichment columns (decision-makers, triggers, firmographics)
- [x] Import 109 OEM companies to Clay
- [x] Validate Clay enrichment quality (107/109 = 98%)
- [ ] Set up Clay HTTP API column for auto-sync to app

## Phase 2: Account Scoring Engine
- [ ] Design account scoring model (0-100 points)
- [ ] Implement scoring algorithm in backend
- [ ] Build Clay API integration to sync enriched data
- [ ] Create database schema for accounts, contacts, triggers
- [ ] Calculate scores for all OEM accounts
- [ ] Build trigger detection logic (electrification, hiring, expansion, partnerships)

## Phase 3: AI Email Generation Engine (CRITICAL)
- [x] Design AI email prompt structure (hypothesis-driven, 150-180 words)
- [x] Implement email generation using built-in LLM
- [x] Build context injection (OEM segment, category, focus, description)
- [x] Add email editing interface for salespeople
- [ ] Generate qualifying questions for follow-up
- [ ] Test email quality with sample accounts

## Phase 4: Frontend Dashboard
- [x] Build account list view with scoring and prioritization
- [x] Build account detail page (firmographics, triggers, contacts)
- [x] Build AI email draft view with editing capability
- [x] Add filtering and search functionality
- [ ] Add mobile-responsive improvements
- [ ] Contact detail page with full history

## Phase 5: Outcome Tracking & Feedback Loop
- [ ] Build outcome tracking (sent, opened, replied, meeting, opportunity, won/lost)
- [ ] Implement conversion analytics by segment, trigger, and role
- [ ] Build feedback loop to refine scoring model
- [ ] Create reporting dashboard
- [ ] Add daily prioritized outreach list generation

## Phase 6: Testing & Delivery
- [ ] Test with sample OEM accounts
- [ ] Validate AI email quality
- [ ] Test outcome tracking workflow
- [ ] Document system usage
- [ ] Train user on system
- [ ] Deploy to production

## Phase 5: Roles, Assignments & CSV Import
- [x] Add role field (admin/salesperson) to user table
- [x] Add assignedTo field to companies table
- [x] Add weeklyList table for Per's weekly assignments
- [x] Admin view: assign companies to salespeople
- [x] Admin view: create weekly list (select X companies per week per salesperson)
- [x] Salesperson view: only see assigned companies
- [x] CSV import button in app (upload Clay export CSV)
- [x] Mobile-responsive improvements (grundläggande)

## Phase 6: UX Improvements (Round 2)
- [x] Aktivitetslogg per företag (samtal, mejl, möten med tidsstämpel och anteckningar)
- [x] Standardsortering efter prioritet (AAA först) i alla listor
- [x] Tydligare navigation - Per = Admin/FC/Säljchef, övriga = Säljare
- [x] Rollbeteckningar uppdaterade i UI (Admin → FC/Säljchef, Salesperson → Säljare)
- [x] Alla intro-texter uppdaterade (Landing, Dashboard, MySales, Admin) för att spegla aktuellt system
