# External Services & API Inventory

This document lists every external service and API the Heidenhain Lead Intelligence app connects to, along with their configuration details and environment variables.

## 1. Database (MySQL / TiDB Serverless)
The application uses a remote MySQL-compatible database (likely TiDB Serverless based on the connection string format typically used with Drizzle in this environment).
*   **Purpose:** Core data storage for users, companies, contacts, emails, and activities.
*   **Integration:** Drizzle ORM (`drizzle-orm/mysql2`).
*   **Environment Variable:** `DATABASE_URL`
*   **Config Location:** `server/db.ts`, `drizzle.config.ts`, `server/_core/env.ts`

## 2. Authentication (Local Email Login)
The app uses a simple local email-based login with JWT session cookies.
*   **Purpose:** User login, session management, and identity verification.
*   **Integration:** JWT session cookies, no external OAuth.
*   **Environment Variable:**
    *   `JWT_SECRET` (Secret for signing/verifying session cookies)
*   **Config Location:** `server/_core/sdk.ts`, `server/_core/oauth.ts`, `server/_core/env.ts`

## 3. LLM Provider (Forge API / Gemini)
The application uses an external LLM API to generate personalized prospecting emails.
*   **Purpose:** AI email generation (Swedish and English).
*   **Integration:** Direct HTTP `fetch` calls to a Forge API endpoint, requesting the `gemini-2.5-flash` model.
*   **Environment Variables:**
    *   `BUILT_IN_FORGE_API_URL` (Base URL, defaults to `https://forge.manus.im`)
    *   `BUILT_IN_FORGE_API_KEY` (Bearer token)
*   **Config Location:** `server/_core/llm.ts`, `server/_core/env.ts`

## 4. Data Enrichment (Clay)
Clay is used as the primary data enrichment engine for finding decision-makers and company firmographics.
*   **Purpose:** Enriching company domains with contact info, triggers, and qualifying questions.
*   **Integration:** 
    *   **Inbound:** The app exposes a webhook (`/api/trpc/webhook.clay`) to receive data *from* Clay.
    *   **Outbound (Partial):** The app has code to push data *to* Clay's REST API (`https://api.clay.com/v1`).
*   **Environment Variables:**
    *   `CLAY_API_KEY` (Bearer token for outbound API calls)
    *   `CLAY_TABLE_ID` (Target table ID in Clay)
*   **Config Location:** `server/clay.ts`, `server/routers.ts` (webhook), `server/_core/env.ts`

## 5. Workflow Automation (Make.com)
Make.com is configured as an intermediary automation layer, likely to orchestrate complex enrichment flows before sending data back to the app.
*   **Purpose:** Triggering external enrichment workflows.
*   **Integration:** HTTP POST to a custom Make.com webhook URL.
*   **Environment Variable:** `MAKE_WEBHOOK_URL`
*   **Config Location:** `server/makecom.ts`, `server/_core/env.ts`

## 6. Maps (Google Maps via Proxy)
The frontend includes a map component for visualizing company locations.
*   **Purpose:** Displaying interactive maps.
*   **Integration:** Google Maps JS API, loaded dynamically via a proxy service to protect API keys.
*   **Environment Variables:**
    *   `VITE_FRONTEND_FORGE_API_URL` (Proxy base URL)
    *   `VITE_FRONTEND_FORGE_API_KEY` (Proxy auth token)
*   **Config Location:** `client/src/components/Map.tsx`

## 7. Analytics (Umami)
The frontend injects a privacy-focused analytics script.
*   **Purpose:** Tracking page views and user interactions.
*   **Integration:** `<script defer src="...">` tag in the main HTML file.
*   **Environment Variables:**
*   **Config Location:** `client/index.html`

## 8. Experimental / Unused Integrations
The repository contains Python scripts that reference additional services not currently wired into the main Node.js application:
*   **Apollo.io:** Referenced in `multi_source_enrichment.py` (uses a hardcoded API key `2VIzVKGfFtu_Mz10xxM9nA`).
*   **LinkedIn Scraping:** Referenced in `free_enrichment_service.py` (uses Google search dorks).
