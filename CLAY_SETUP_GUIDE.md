# Clay Configuration Guide för Heidenhain Lead Intelligence

## Översikt
Denna guide visar hur du konfigurerar Clay för att automatiskt berika företagsdata med beslutsfattare, triggers, entry angles och qualifying questions.

---

## Del 1: Skapa Tabell och Grundinställningar

### Steg 1: Skapa ny tabell
1. Logga in på **Clay** (app.clay.com)
2. Klicka på **"+ New Table"**
3. Välj **"Blank table"** eller **"Use a template"**
4. Namnge tabellen: **"Heidenhain Marine Prospects"**

### Steg 2: Lägg till grundkolumner
Skapa följande kolumner (klicka på **"+ Add column"**):

| Kolumnnamn | Typ | Beskrivning |
|------------|-----|-------------|
| `company_name` | Text | Företagsnamn |
| `domain` | Text | Företagets webbplats (t.ex. kongsberg.com) |
| `country` | Text | Land |
| `city` | Text | Stad |
| `segment` | Text | Affärssegment (t.ex. "Marine Automation") |

---

## Del 2: Konfigurera Enrichment (Waterfall)

### Steg 3: Lägg till Company Enrichment

1. **Lägg till enrichment-kolumn:**
   - Klicka på **"+ Add column"** → **"Enrich data"**
   - Välj **"Find company"** eller **"Clearbit Company"**

2. **Konfigurera enrichment:**
   - Input: `{{domain}}` (använd domain-kolumnen)
   - Output fields att inkludera:
     - Company name
     - Industry
     - Employee count
     - Revenue
     - Description
     - LinkedIn URL
     - Location (Country, City)

3. **Lägg till Waterfall (rekommenderat):**
   - Klicka på enrichment-kolumnen → **"Add waterfall"**
   - Lägg till flera källor i fallback-ordning:
     1. **Clearbit** (bäst för företagsdata)
     2. **Apollo.io** (bra för kontakter)
     3. **Hunter.io** (email-verifiering)
     4. **LinkedIn Company** (social data)

### Steg 4: Hitta Beslutsfattare (Decision Makers)

1. **Lägg till "Find people" enrichment:**
   - Klicka på **"+ Add column"** → **"Enrich data"** → **"Find people"**
   - Välj **"Apollo.io People Search"** eller **"LinkedIn People Search"**

2. **Konfigurera sökning:**
   - Company: `{{company_name}}`
   - Job titles (sök efter dessa roller):
     ```
     CTO, Chief Technology Officer
     VP Engineering, Engineering Director
     Head of Procurement, Purchasing Manager
     Operations Manager, Production Manager
     CEO, Managing Director
     ```
   - Location: `{{country}}`
   - Limit: **5 personer** per företag

3. **Output fields:**
   - Full name
   - Job title
   - Email (om tillgänglig)
   - Phone (om tillgänglig)
   - LinkedIn URL
   - Department/Function

4. **Skapa "Role Classification" (AI-kolumn):**
   - Lägg till **"Use AI"** kolumn
   - Prompt:
     ```
     Based on this job title: {{job_title}}
     
     Classify this person's role as one of:
     - Technical (CTO, Engineering, R&D, Technical roles)
     - Business (CEO, Managing Director, Business Development)
     - Procurement (Purchasing, Procurement, Supply Chain)
     
     Return only: Technical, Business, or Procurement
     ```

---

## Del 3: Generera Triggers (Buying Signals)

### Steg 5: Hämta Company News

1. **Lägg till News enrichment:**
   - Klicka på **"+ Add column"** → **"Enrich data"** → **"Google News"**
   - Search query: `{{company_name}} expansion OR investment OR automation OR marine`
   - Time range: **Last 6 months**
   - Limit: **5 artiklar**

2. **Extrahera triggers med AI:**
   - Lägg till **"Use AI"** kolumn
   - Namnge: **"Triggers"**
   - Prompt:
     ```
     You are analyzing news and company information for {{company_name}} in the {{segment}} industry.
     
     Based on this data:
     - Company description: {{description}}
     - Recent news: {{news_articles}}
     - Industry: {{industry}}
     
     Generate 2-4 buying signals (triggers) that indicate this company might need precision measurement systems, encoders, or automation solutions.
     
     For each trigger, provide:
     1. A clear, specific trigger statement in Swedish
     2. The source (News, Company website, LinkedIn, etc.)
     3. Relevance level (High, Medium, Low)
     
     Format as JSON array:
     [
       {
         "text": "Expansion inom autonoma fartyg",
         "source": "Company News",
         "relevance": "High"
       }
     ]
     
     Focus on:
     - Expansion plans
     - New facilities or production lines
     - Technology investments
     - Automation initiatives
     - Marine sector growth
     - Precision requirements
     ```

---

## Del 4: Generera Entry Angles (Säljargument)

### Steg 6: Skapa Entry Angles med AI

1. **Lägg till AI-kolumn:**
   - Klicka på **"+ Add column"** → **"Use AI"**
   - Namnge: **"Entry Angles"**

2. **AI Prompt:**
   ```
   You are a sales strategist for Heidenhain, a leading manufacturer of precision measurement and control equipment (encoders, linear scales, digital readouts, CNC controls).
   
   Company context:
   - Name: {{company_name}}
   - Industry: {{industry}}
   - Segment: {{segment}}
   - Size: {{employee_count}}
   - Triggers: {{triggers}}
   
   Generate 2-3 compelling entry angles (sales arguments) in Swedish that would resonate with this company.
   
   Each entry angle should:
   1. Connect to their specific needs/triggers
   2. Highlight Heidenhain's relevant solutions
   3. Be tailored to a specific persona (Technical/Business/Procurement)
   
   Format as JSON array:
   [
     {
       "angle": "Precision encoders för autonoma navigationssystem med 0.001° upplösning",
       "target": "Technical",
       "product": "Encoders"
     }
   ]
   
   Heidenhain products to reference:
   - Absolute encoders (high precision, reliable)
   - Linear encoders (measurement accuracy)
   - Digital readouts (DRO)
   - CNC controls (TNC series)
   - Length gauges
   ```

---

## Del 5: Generera Qualifying Questions

### Steg 7: Skapa Qualifying Questions med AI

1. **Lägg till AI-kolumn:**
   - Klicka på **"+ Add column"** → **"Use AI"**
   - Namnge: **"Qualifying Questions"**

2. **AI Prompt:**
   ```
   You are a sales qualification expert for Heidenhain (precision measurement systems).
   
   Company context:
   - Name: {{company_name}}
   - Industry: {{industry}}
   - Segment: {{segment}}
   - Decision makers: {{decision_makers}}
   - Triggers: {{triggers}}
   
   Generate 3-5 qualifying questions in Swedish that a sales rep should ask to determine if this is a good opportunity.
   
   Questions should cover:
   1. Technical requirements (precision, environment, integration)
   2. Business drivers (timeline, budget, decision process)
   3. Current situation (existing systems, pain points)
   
   Format as JSON array:
   [
     {
       "question": "Vilka precisionskrav har ni för era mätsystem i produktionen?",
       "category": "Technical",
       "purpose": "Understand precision requirements"
     }
   ]
   
   Make questions:
   - Open-ended
   - Specific to their industry/segment
   - Designed to uncover needs for Heidenhain solutions
   ```

---

## Del 6: Exportera Data till Heidenhain-appen

### Steg 8: Skapa API Access

1. **Gå till Clay Settings:**
   - Klicka på din profil (uppe till höger)
   - Välj **"Settings"** → **"API"**

2. **Skapa API Key:**
   - Klicka på **"Create API Key"**
   - Namnge: **"Heidenhain Integration"**
   - Kopiera API-nyckeln (börjar med `clay_...`)
   - **SPARA DENNA NYCKEL** - du behöver ge den till Manus

3. **Hitta Table ID:**
   - Gå tillbaka till din tabell
   - Titta på URL:en i webbläsaren
   - Table ID är den långa strängen efter `/tables/`
   - Exempel: `https://app.clay.com/workspaces/123/tables/tbl_abc123xyz`
   - Table ID = `tbl_abc123xyz`

---

## Del 7: Testa Enrichment

### Steg 9: Lägg till testföretag

Lägg till dessa testföretag för att verifiera att allt fungerar:

| company_name | domain | country | city | segment |
|--------------|--------|---------|------|---------|
| Kongsberg Maritime | kongsberg.com | Norge | Kongsberg | Marine Automation |
| Wärtsilä | wartsila.com | Finland | Helsinki | Marine Propulsion |
| Rolls-Royce Marine | rolls-royce.com | Storbritannien | London | Marine Power Systems |

### Steg 10: Kör Enrichment

1. Markera alla rader
2. Klicka på varje enrichment-kolumn
3. Välj **"Run enrichment"**
4. Vänta tills alla kolumner är ifyllda (kan ta 2-5 minuter)

### Steg 11: Verifiera Output

Kontrollera att du får:
- ✅ Företagsdata (industry, size, revenue)
- ✅ 3-5 beslutsfattare per företag
- ✅ 2-4 triggers per företag
- ✅ 2-3 entry angles per företag
- ✅ 3-5 qualifying questions per företag

---

## Del 8: Ge Uppgifter till Manus

När allt fungerar, ge följande till Manus-agenten:

```
CLAY_API_KEY: clay_xxxxxxxxxxxxxxxxxxxxx
CLAY_TABLE_ID: tbl_xxxxxxxxxxxxxxxxxxxxx
```

Manus kommer då att:
1. Integrera Clay API i Heidenhain-appen
2. Automatiskt hämta berikad data när nya företag läggs till
3. Visa beslutsfattare, triggers, entry angles och qualifying questions i UI:t

---

## Troubleshooting

### Problem: Enrichment misslyckas
- **Lösning:** Lägg till Waterfall med flera källor (Clearbit → Apollo → Hunter)
- Kontrollera att domain är korrekt format (utan http://)

### Problem: Inga beslutsfattare hittas
- **Lösning:** Prova olika job title-varianter
- Använd både engelska och svenska titlar
- Öka limit till 10 personer

### Problem: AI genererar dåliga triggers/questions
- **Lösning:** Förbättra prompt med mer kontext
- Lägg till exempel i prompten
- Specificera Heidenhain's produkter mer detaljerat

### Problem: För få credits
- **Lösning:** Prioritera de viktigaste enrichments
- Använd Waterfall för att spara credits
- Kör enrichment i batchar istället för alla på en gång

---

## Nästa Steg

När Clay är konfigurerat:
1. ✅ Ge API Key och Table ID till Manus
2. ✅ Manus integrerar Clay i Heidenhain-appen
3. ✅ Testa att lägga till företag i appen
4. ✅ Verifiera att berikad data dyker upp automatiskt

---

## Support

Om du stöter på problem:
- Clay dokumentation: https://docs.clay.com
- Clay community: https://community.clay.com
- Kontakta Manus-agenten för teknisk support med integrationen
