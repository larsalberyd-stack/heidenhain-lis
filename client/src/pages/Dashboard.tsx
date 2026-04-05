import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, TrendingUp, Mail, Search, Filter,
  Globe, MapPin, ChevronRight, Zap, Plus, Shield, LogIn
} from "lucide-react";
import AddCompanyModal from "@/components/AddCompanyModal";

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

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [filterFocus, setFilterFocus] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { data: companies = [], isLoading: loadingCompanies } = trpc.companies.list.useQuery();
  const { data: stats, isLoading: loadingStats } = trpc.dashboard.stats.useQuery();

  const PRIORITY_ORDER: Record<string, number> = { AAA: 0, AA: 1, A: 2, B: 3, C: 4 };

  const filtered = useMemo(() => {
    return companies
      .filter(c => {
        const matchSearch = !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.city || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.country || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.category || "").toLowerCase().includes(search.toLowerCase());
        const matchFocus = filterFocus === "all" || c.focus === filterFocus;
        const matchStatus = filterStatus === "all" || c.status === filterStatus;
        return matchSearch && matchFocus && matchStatus;
      })
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.focus || "C"] ?? 4;
        const pb = PRIORITY_ORDER[b.focus || "C"] ?? 4;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name, "sv");
      });
  }, [companies, search, filterFocus, filterStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Heidenhain Lead Intelligence</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Sorterat AAA → C · Heidenhain Scandinavia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-1 hidden sm:flex border-red-200 text-red-700 hover:bg-red-50">
                  <Shield className="w-4 h-4" />
                  FC / Säljchef
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/my-sales">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  Mina prospekt
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1.5">
                <span>{user?.name || user?.email}</span>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-gray-600">{user?.role === "admin" ? "FC" : "Säljare"}</span>
              </div>
            )}
            {!isAuthenticated && (
              <a href={getLoginUrl()}>
                <Button variant="outline" size="sm" className="gap-1">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Logga in</span>
                </Button>
              </a>
            )}
            <Button onClick={() => setAddCompanyOpen(true)} size="sm" className="bg-red-600 hover:bg-red-700 gap-1">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Lägg till</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {loadingStats ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg"><Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats?.totalCompanies ?? 0}</p>
                      <p className="text-xs text-gray-500">Företag</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg"><Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /></div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats?.totalContacts ?? 0}</p>
                      <p className="text-xs text-gray-500">Kontakter</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-red-50 rounded-lg"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /></div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">
                        {(stats?.aaaCount ?? 0) + (stats?.aaCount ?? 0)}
                      </p>
                      <p className="text-xs text-gray-500">AAA + AA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg"><Mail className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" /></div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold">{stats?.emailsGenerated ?? 0}</p>
                      <p className="text-xs text-gray-500">Mejl</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Sök företag, stad, land..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterFocus} onValueChange={setFilterFocus}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Prioritet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla prioriteter</SelectItem>
              <SelectItem value="AAA">AAA</SelectItem>
              <SelectItem value="AA">AA</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="new">Ny</SelectItem>
              <SelectItem value="contacted">Kontaktad</SelectItem>
              <SelectItem value="meeting">Möte bokat</SelectItem>
              <SelectItem value="qualified">Kvalificerad</SelectItem>
              <SelectItem value="lost">Förlorad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          Visar {filtered.length} av {companies.length} företag
        </p>

        {/* Company Grid */}
        {loadingCompanies ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(9).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Inga företag hittades</p>
              <p className="text-sm text-gray-400 mt-1">Prova att ändra sökning eller filter</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(company => (
              <Link key={company.id} href={`/company/${company.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer border hover:border-red-200 group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-red-700 transition-colors">
                          {company.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{[company.city, company.country].filter(Boolean).join(", ") || "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {company.focus && (
                          <Badge className={`text-xs border ${focusBadge[company.focus] || focusBadge.C}`}>
                            {company.focus}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors" />
                      </div>
                    </div>

                    {company.category && (
                      <p className="text-xs text-gray-500 mb-3 truncate">{company.category}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusConfig[company.status]?.color || "bg-gray-400"}`} />
                        <span className="text-xs text-gray-600">{statusConfig[company.status]?.label || company.status}</span>
                      </div>
                      {company.employeeRange && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Globe className="w-3 h-3" />
                          <span>{company.employeeRange}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <AddCompanyModal
        open={addCompanyOpen}
        onClose={() => setAddCompanyOpen(false)}
      />
    </div>
  );
}
