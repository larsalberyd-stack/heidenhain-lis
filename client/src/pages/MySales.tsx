import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
// import { getLoginUrl } from "@/const";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, MapPin, ChevronRight, Zap, LogIn, User, Send, Pin } from "lucide-react";

const focusBadge: Record<string, string> = {
  AAA: "bg-red-100 text-red-800 border-red-200",
  AA: "bg-orange-100 text-orange-800 border-orange-200",
  A: "bg-yellow-100 text-yellow-800 border-yellow-200",
  B: "bg-blue-100 text-blue-800 border-blue-200",
  C: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "Ny", color: "bg-gray-400" },
  contacted: { label: "Kontaktad", color: "bg-blue-500" },
  meeting: { label: "Möte bokat", color: "bg-purple-500" },
  qualified: { label: "Kvalificerad", color: "bg-green-500" },
  lost: { label: "Förlorad", color: "bg-red-400" },
};

export default function MySales() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [search, setSearch] = useState("");

  const { data: myCompanies = [], isLoading: loadingCompanies } = trpc.companies.byUserEngagement.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const PRIORITY_ORDER: Record<string, number> = { AAA: 0, AA: 1, A: 2, B: 3, C: 4 };

  const filtered = useMemo(() => {
    const list = !search
      ? myCompanies
      : myCompanies.filter(c => {
          const q = search.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            (c.city || "").toLowerCase().includes(q) ||
            (c.category || "").toLowerCase().includes(q)
          );
        });
    return [...list].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.focus || "C"] ?? 4;
      const pb = PRIORITY_ORDER[b.focus || "C"] ?? 4;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, "sv");
    });
  }, [myCompanies, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center mb-4">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Heidenhain Lead Intelligence</h1>
        <p className="text-gray-500 mb-6 text-center max-w-sm">
          Logga in för att se dina tilldelade prospekt.
        </p>
        <a href="/login">
          <Button className="bg-red-600 hover:bg-red-700 gap-2">
            <LogIn className="w-4 h-4" />
            Logga in
          </Button>
        </a>
      </div>
    );
  }

  const newCount = myCompanies.filter(c => c.status === "new").length;
  const contactedCount = myCompanies.filter(c => c.status === "contacted").length;
  const meetingCount = myCompanies.filter(c => c.status === "meeting").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Mina Prospekt</h1>
              <p className="text-xs text-gray-500">Tilldelade + egna aktiviteter · Sorterat AAA → C</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="hidden sm:flex gap-1 border-red-200 text-red-700 hover:bg-red-50">
                  FC / Säljchef
                </Button>
              </Link>
            )}
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="hidden sm:flex">Alla företag</Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</span>
                <span className="text-xs text-gray-400">{user?.role === "admin" ? "FC / Säljchef" : "Säljare"}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-xs text-gray-500">
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{myCompanies.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tilldelade</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{contactedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Kontaktade</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{meetingCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Möten</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Sök bland dina prospekt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {myCompanies.length === 0 && !loadingCompanies ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Inga prospekt än</p>
              <p className="text-sm text-gray-400 mt-1">
                Företag du tilldelas eller mejlar dyker upp här automatiskt.
              </p>
            </CardContent>
          </Card>
        ) : loadingCompanies ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(company => (
              <Link key={company.id} href={`/company/${company.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border hover:border-red-200 group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-red-700 transition-colors">
                            {company.name}
                          </h3>
                          {company.focus && (
                            <Badge className={`text-xs border flex-shrink-0 ${focusBadge[company.focus] || focusBadge.C}`}>
                              {company.focus}
                            </Badge>
                          )}
                          {(company as any).isAssigned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                              <Pin className="w-2.5 h-2.5" />
                              Tilldelad
                            </span>
                          )}
                          {(company as any).hasOwnActivity && !(company as any).isAssigned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                              <Send className="w-2.5 h-2.5" />
                              Egen aktivitet
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {(company.city || company.country) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[company.city, company.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {company.category && <span className="truncate">{company.category}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusConfig[company.status]?.color || "bg-gray-400"}`} />
                          <span className="text-xs text-gray-600 hidden sm:block">{statusConfig[company.status]?.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
