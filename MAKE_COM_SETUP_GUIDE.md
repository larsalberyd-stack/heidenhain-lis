# Make.com Setup Guide för Heidenhain Lead Intelligence

## Översikt
Make.com fungerar som en integration-layer mellan Heidenhain-appen och Clay, vilket gör att vi kan använda Clay's enrichment utan att behöva ett Enterprise API.

---

## Del 1: Skapa Make.com-konto (om du inte redan har ett)

1. Gå till **https://www.make.com**
2. Klicka **"Sign up for free"**
3. Skapa konto med din e-post
4. Verifiera e-postadressen

**Gratis plan ger:**
- 1,000 operations per månad
- Obegränsat antal scenarios
- Alla integrationer (inklusive Clay)

---

## Del 2: Skapa nytt Scenario

### Steg 1: Skapa scenario
1. Logga in på Make.com
2. Klicka **"Create a new scenario"**
3. Namnge scenariot: **"Heidenhain Clay Enrichment"**

### Steg 2: Lägg till Webhook Trigger
1. Klicka på **"+"** för att lägga till första modulen
2. Sök efter **"Webhooks"**
3. Välj **"Custom webhook"**
4. Klicka **"Create a webhook"**
5. Namnge: **"Heidenhain Company Input"**
6. Kopiera **Webhook URL** (ser ut som: `https://hook.eu1.make.com/xxxxx`)
7. **SPARA DENNA URL** - du behöver ge den till Manus senare

### Steg 3: Lägg till Clay-modul (Add Row)
1. Klicka på **"+"** efter webhook-modulen
2. Sök efter **"Clay"**
3. Välj **"Add a row to table"**
4. Klicka **"Create a connection"** till Clay
5. Make öppnar Clay för att auktorisera - godkänn åtkomst
6. Välj din **Workbook**: "Heidenhain Marine Prospects"
7. Välj din **Table**: "Find key decision makers..."
8. Mappa fält:
   - **company_domain**: `{{1.company_domain}}` (från webhook)
   - **segment**: `{{1.segment}}` (från webhook)

### Steg 4: Lägg till Sleep-modul (Vänta på enrichment)
1. Klicka på **"+"** efter Clay-modulen
2. Sök efter **"Tools"** → **"Sleep"**
3. Sätt **Delay**: **60 sekunder** (ger Clay tid att berika)

### Steg 5: Lägg till Clay-modul (Get Row)
1. Klicka på **"+"** efter Sleep-modulen
2. Sök efter **"Clay"**
3. Välj **"Get a row"**
4. Använd samma Clay-connection
5. Välj samma Workbook och Table
6. **Row ID**: `{{2.id}}` (från Add Row-modulen)

### Steg 6: Lägg till Webhook Response
1. Klicka på **"+"** efter Get Row-modulen
2. Sök efter **"Webhooks"**
3. Välj **"Webhook response"**
4. **Status**: `200`
5. **Body**: Klicka "Add item" och lägg till:

```json
{
  "success": true,
  "company_name": "{{4.company_name}}",
  "industry": "{{4.industry}}",
  "employee_count": "{{4.employee_count}}",
  "decision_makers": "{{4.decision_makers}}",
  "triggers": "{{4.triggers}}",
  "entry_angles": "{{4.entry_angles}}",
  "qualifying_questions": "{{4.qualifying_questions}}"
}
```

### Steg 7: Spara och aktivera
1. Klicka **"Save"** (nere till vänster)
2. Aktivera scenariot genom att klicka på **"ON"**-knappen

---

## Del 3: Testa scenariot

### Steg 1: Skicka test-data
1. I Make.com, klicka **"Run once"**
2. Make väntar på webhook-data
3. Öppna en terminal och kör:

```bash
curl -X POST https://hook.eu1.make.com/xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "company_domain": "kongsberg.com",
    "segment": "Marine Automation"
  }'
```

(Byt ut `xxxxx` mot din webhook URL)

### Steg 2: Verifiera resultat
1. Make visar execution-flödet
2. Kontrollera att alla moduler är gröna (✓)
3. Klicka på sista modulen (Webhook Response) för att se output
4. Du borde se berikad data från Clay

### Steg 3: Kontrollera Clay
1. Gå till din Clay-tabell
2. En ny rad med "kongsberg.com" borde ha lagts till
3. Alla enrichment-kolumner borde vara ifyllda

---

## Del 4: Ge webhook-URL till Manus

När scenariot fungerar, ge följande till Manus-agenten:

```
MAKE_WEBHOOK_URL: https://hook.eu1.make.com/xxxxx
```

Manus kommer då att:
1. Uppdatera Heidenhain-appen för att använda Make.com
2. Testa integrationen end-to-end
3. Visa berikad data i UI:t

---

## Troubleshooting

### Problem: Clay-connection misslyckas
**Lösning:**
- Kontrollera att du är inloggad på Clay
- Försök skapa connection igen
- Se till att du har rätt workspace vald

### Problem: Timeout efter 60 sekunder
**Lösning:**
- Öka Sleep-tiden till 90 sekunder
- Kontrollera att Auto-run är aktiverat i Clay

### Problem: Tomma fält i response
**Lösning:**
- Kontrollera att Clay-enrichments har körts klart
- Verifiera att kolumnnamnen matchar (case-sensitive)
- Testa att hämta raden manuellt i Clay

### Problem: "No data" error
**Lösning:**
- Kontrollera att webhook-data har rätt format
- Se till att `company_domain` och `segment` skickas korrekt

---

## Nästa steg

1. ✅ Skapa Make.com-scenario enligt guiden ovan
2. ✅ Testa med curl-kommandot
3. ✅ Verifiera att data kommer tillbaka
4. ✅ Ge webhook-URL till Manus
5. ✅ Manus integrerar Make.com i Heidenhain-appen

---

## Kostnadsuppskattning

**Make.com gratis plan:**
- 1,000 operations/månad
- Varje företag som berikas = 5 operations (webhook in, add row, sleep, get row, webhook out)
- **= 200 företag per månad gratis**

Om du behöver mer:
- **Core plan**: $9/månad = 10,000 operations = 2,000 företag/månad
- **Pro plan**: $16/månad = 10,000 operations + fler features

---

## Support

Om du stöter på problem:
- Make.com dokumentation: https://www.make.com/en/help
- Make.com community: https://community.make.com
- Kontakta Manus-agenten för teknisk support
