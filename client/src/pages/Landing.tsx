import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Target, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Clock,
  Shield,
  Activity,
  SortAsc
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container py-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="text-sm px-4 py-1">
            Heidenhain Scandinavia AB
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight">
            Lead Intelligence System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ett strukturerat säljstödsverktyg för FC och säljteamet — från prospektlista till 
            AI-genererade Decision-Maker Packs, tilldelning, aktivitetslogg och uppföljning.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => setLocation("/dashboard")}>
              Kom igång
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Läs mer
            </Button>
          </div>
        </div>
      </div>

      {/* Problem & Solution */}
      <div className="container py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Problemet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                • <strong>Manuell prospektering tar 5-10 timmar/vecka</strong> — säljare spenderar mer tid på research än försäljning
              </p>
              <p className="text-sm text-muted-foreground">
                • <strong>Fel personer kontaktas</strong> — kontakter når inte rätt beslutsfattare
              </p>
              <p className="text-sm text-muted-foreground">
                • <strong>Leads tappas i pipelinen</strong> — ingen struktur för uppföljning och aktivitetslogg
              </p>
              <p className="text-sm text-muted-foreground">
                • <strong>FC saknar överblick</strong> — svårt att se vad som händer i teamets pipeline
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" />
                Lösningen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                • <strong>AI-genererade Decision-Maker Packs</strong> — beslutsfattare, triggers och entry angles på sekunder
              </p>
              <p className="text-sm text-muted-foreground">
                • <strong>FC tilldelar och trafikleder</strong> — veckolistor med deadline direkt till säljaren
              </p>
              <p className="text-sm text-muted-foreground">
                • <strong>Aktivitetslogg per företag</strong> — logga samtal, mejl och möten med tidsstämpel
              </p>
              <p className="text-sm text-muted-foreground">
                • <strong>Prioritetssortering AAA → C</strong> — rätt fokus automatiskt, alltid
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="container py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Roller & Ansvar</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-primary mb-2" />
                <CardTitle>FC / Säljchef</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Per Wincent som FC har full kontroll och admin-behörighet i systemet.
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>→ Tilldelar företag till säljare med deadline</li>
                  <li>→ Trafikleder och prioriterar AAA–C</li>
                  <li>→ Följer upp aktiviteter och pipeline-status</li>
                  <li>→ Importerar prospektlistor via CSV</li>
                  <li>→ Hanterar användare och roller</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-2" />
                <CardTitle>Säljare</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Säljarna ser sina tilldelade prospekt och driver kontaktarbetet framåt.
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>→ Ser sina tilldelade företag under "Mina Prospekt"</li>
                  <li>→ Genererar AI Decision-Maker Pack per företag</li>
                  <li>→ Loggar samtal, mejl och möten</li>
                  <li>→ Uppdaterar status och nästa steg</li>
                  <li>→ Använder genererade mejl och entry angles</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="container py-16" id="features">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Hur Det Fungerar</h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">FC importerar och prioriterar</h3>
                <p className="text-muted-foreground">
                  FC laddar upp prospektlista via CSV eller lägger till företag manuellt. Varje företag tilldelas prioritet AAA, AA, A, B eller C — listan sorteras automatiskt.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">FC tilldelar säljare med deadline</h3>
                <p className="text-muted-foreground">
                  I FC-panelen väljer Per vilka företag som ska bearbetas denna vecka, tilldelar dem till rätt säljare och sätter deadline.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Säljaren genererar Decision-Maker Pack</h3>
                <p className="text-muted-foreground">
                  AI tar fram ett komplett pack med beslutsfattare, triggers, entry angles, kvalificerande frågor och ett färdigt kontaktmejl på 10–20 sekunder.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Säljaren kontaktar och loggar</h3>
                <p className="text-muted-foreground">
                  Säljaren kontaktar beslutsfattaren och loggar varje aktivitet — samtal, mejl skickat, svar mottaget, möte bokat — direkt på företagssidan med tidsstämpel.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                5
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">FC följer upp och trafikleder</h3>
                <p className="text-muted-foreground">
                  FC ser aktivitetsloggar, pipeline-status och kan justera prioritet, omtilldela eller eskalera. Full kontroll utan att behöva fråga säljarna vad som händer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Vad Systemet Klarar</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="w-5 h-5" />
                  Nuvarande Funktioner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">✅ AI-genererade Decision-Maker Packs (10–20 sek)</p>
                <p className="text-sm">✅ Beslutsfattare med roller och kontaktuppgifter</p>
                <p className="text-sm">✅ Triggers, entry angles och kvalificerande frågor</p>
                <p className="text-sm">✅ Automatiskt genererade kontaktmejl</p>
                <p className="text-sm">✅ FC tilldelar säljare med deadline</p>
                <p className="text-sm">✅ Aktivitetslogg per företag (samtal, mejl, möten)</p>
                <p className="text-sm">✅ Prioritetssortering AAA → C automatiskt</p>
                <p className="text-sm">✅ Statushantering (Ny → Kontaktad → Möte → Kvalificerad)</p>
                <p className="text-sm">✅ Rollbaserade vyer — FC ser allt, säljare ser sina</p>
                <p className="text-sm">✅ CSV-import av prospektlistor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="w-5 h-5" />
                  Kommande Funktioner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">⚠️ Verifierade mejladresser (kräver betald tjänst)</p>
                <p className="text-sm">⚠️ Direkta LinkedIn-profiler (länkar till sökning idag)</p>
                <p className="text-sm">⚠️ Automatisk mejl-skickning (mejl genereras, skickas manuellt)</p>
                <p className="text-sm">⚠️ FC-dashboard med aktivitetsöversikt per säljare</p>
                <p className="text-sm">⚠️ Påminnelser för inaktiva prospekt</p>
                <p className="text-sm">⚠️ Kalenderintegration för mötesbokningar</p>
                <p className="text-sm">⚠️ Exportera veckorapport (CSV/PDF)</p>
                <p className="text-sm">💡 Prioriteras baserat på teamets feedback</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Redo att Komma Igång?</h2>
          <p className="text-xl text-muted-foreground">
            Logga in med ditt Manus-konto för att komma åt dina tilldelade prospekt.
          </p>
          <Button size="lg" onClick={() => setLocation("/dashboard")}>
            Öppna Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
