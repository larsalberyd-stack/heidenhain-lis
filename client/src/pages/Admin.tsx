import { useState, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2, Users, ChevronRight, Zap, Upload, Calendar,
  UserCheck, ArrowLeft, CheckSquare, Square, RefreshCw, Shield
} from "lucide-react";

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

function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-V${String(week).padStart(2, "0")}`;
}

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"assign" | "import" | "users">("assign");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [weekLabel, setWeekLabel] = useState(getWeekLabel());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ created: number; errors: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: companies = [], isLoading: loadingCompanies } = trpc.companies.list.useQuery();
  const { data: users = [], isLoading: loadingUsers } = trpc.users.list.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: assignments = [], isLoading: loadingAssignments } = trpc.assignments.list.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const assignMutation = trpc.assignments.create.useMutation({
    onSuccess: () => {
      toast.success("Veckolis skapad och tilldelad!");
      setAssignDialogOpen(false);
      setSelectedCompanyIds([]);
      utils.assignments.list.invalidate();
      utils.companies.list.invalidate();
    },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Roll uppdaterad!");
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error("Fel: " + e.message),
  });

  const importCsvMutation = trpc.companies.importCsv.useMutation({
    onSuccess: (result) => {
      setImportProgress(result);
      setImporting(false);
      utils.companies.list.invalidate();
      toast.success(`Import klar! ${result.created} företag importerade.`);
    },
    onError: (e) => {
      setImporting(false);
      toast.error("Import misslyckades: " + e.message);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Inloggning krävs</h2>
          <p className="text-gray-500 mb-4">Du måste logga in för att komma åt admin-panelen.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-red-600 hover:bg-red-700 w-full">Logga in</Button>
          </a>
        </Card>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-sm">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Åtkomst nekad</h2>
          <p className="text-gray-500 mb-4">Du har inte admin-behörighet.</p>
          <Link href="/dashboard">
            <Button variant="outline">Tillbaka till dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const toggleCompany = (id: number) => {
    setSelectedCompanyIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedCompanyIds(companies.map(c => c.id));
  };

  const clearSelection = () => setSelectedCompanyIds([]);

  const handleAssign = () => {
    if (!selectedUserId || selectedCompanyIds.length === 0) return;
    const selectedUser = users.find(u => u.id === Number(selectedUserId));
    if (!selectedUser) return;
    assignMutation.mutate({
      assignedToUserId: selectedUser.id,
      assignedToName: selectedUser.name || selectedUser.email || "Säljare",
      weekLabel,
      companyIds: selectedCompanyIds,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportProgress(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("CSV-filen verkar tom");
        setImporting(false);
        return;
      }

      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      const rows = lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",\n]+)(?=\s*,|\s*$)/g) || [];
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = (values[i] || "").replace(/^"|"$/g, "").trim();
        });
        return row;
      }).filter(row => Object.values(row).some(v => v));

      await importCsvMutation.mutateAsync({ rows });
    } catch (err: any) {
      setImporting(false);
      toast.error("Fel vid inläsning av fil: " + err.message);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const unassignedCount = companies.filter(c => !c.assignedToUserId).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">FC / Säljchef</h1>
                <p className="text-xs text-gray-500">Heidenhain Lead Intelligence</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <span>Inloggad som</span>
            <span className="font-medium text-gray-900">{user?.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">FC</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {[
            { key: "assign", label: "Tilldela veckolista", icon: Calendar },
            { key: "import", label: "Importera CSV", icon: Upload },
            { key: "users", label: "Användare", icon: Users },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Tab: Assign ── */}
        {activeTab === "assign" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tilldela veckolista</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Välj företag (AAA först), tilldela till säljare och sätt deadline för veckan.
                  <span className="ml-2 font-medium text-orange-600">{unassignedCount} otilldelade</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCompanyIds.length > 0 && (
                  <Button
                    onClick={() => setAssignDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-700 gap-1"
                    size="sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    Tilldela {selectedCompanyIds.length} st
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={selectAll}>Välj alla</Button>
                {selectedCompanyIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>Rensa</Button>
                )}
              </div>
            </div>

            {/* Recent assignments */}
            {assignments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Senaste veckolistor</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assignments.slice(0, 6).map((a: any) => (
                    <Card key={a.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{a.assignedToName}</p>
                            <p className="text-xs text-gray-500">{a.weekLabel} · {a.companyCount ?? "?"} företag</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{a.weekLabel}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Company list */}
            {loadingCompanies ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array(9).fill(0).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {companies.map(company => {
                  const selected = selectedCompanyIds.includes(company.id);
                  return (
                    <Card
                      key={company.id}
                      onClick={() => toggleCompany(company.id)}
                      className={`cursor-pointer transition-all border-2 ${
                        selected
                          ? "border-red-500 bg-red-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 flex-shrink-0">
                            {selected
                              ? <CheckSquare className="w-4 h-4 text-red-600" />
                              : <Square className="w-4 h-4 text-gray-300" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="font-medium text-sm truncate">{company.name}</p>
                              {company.focus && (
                                <Badge className={`text-xs border flex-shrink-0 ${focusBadge[company.focus] || focusBadge.C}`}>
                                  {company.focus}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{company.category || "—"}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[company.status]?.color || "bg-gray-400"}`} />
                              <span className="text-xs text-gray-500">{statusConfig[company.status]?.label || company.status}</span>
                              {company.assignedToUserId && (
                                <span className="text-xs text-blue-600 ml-auto">✓ Tilldelad</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Import CSV ── */}
        {activeTab === "import" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Importera från Clay</h2>
            <p className="text-sm text-gray-500 mb-6">
              Exportera CSV från Clay och ladda upp här. Befintliga företag uppdateras, nya läggs till. Prioritet (AAA–C) behålls om den redan är satt.
            </p>

            <Card>
              <CardContent className="p-6">
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-red-300 hover:bg-red-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-700">Klicka för att välja CSV-fil</p>
                  <p className="text-sm text-gray-400 mt-1">Exportera från Clay → Download CSV</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {importing && (
                  <div className="mt-4 flex items-center gap-2 text-blue-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Importerar data...</span>
                  </div>
                )}

                {importProgress && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-medium text-green-800">Import klar!</p>
                    <p className="text-sm text-green-700 mt-1">
                      {importProgress.created} företag importerade/uppdaterade
                      {importProgress.errors > 0 && `, ${importProgress.errors} fel`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Hur det fungerar</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2"><span className="font-bold text-red-600">1.</span> Gå till Clay och öppna tabellen med företag</li>
                <li className="flex gap-2"><span className="font-bold text-red-600">2.</span> Klicka "Export" → "Download CSV"</li>
                <li className="flex gap-2"><span className="font-bold text-red-600">3.</span> Ladda upp filen här</li>
                <li className="flex gap-2"><span className="font-bold text-red-600">4.</span> Appen uppdaterar automatiskt alla företag</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── Tab: Users ── */}
        {activeTab === "users" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Användare</h2>
            <p className="text-sm text-gray-500 mb-6">
              Hantera roller för inloggade användare. FC/Säljchef kan tilldela veckolistor och följa upp.
            </p>

            {loadingUsers ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
                ))}
              </div>
            ) : users.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Inga användare har loggat in ännu.</p>
                  <p className="text-sm text-gray-400 mt-1">Dela länken med säljarna så de kan logga in.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {users.map((u: any) => (
                  <Card key={u.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.name || "Okänd"}</p>
                            <p className="text-xs text-gray-500">{u.email || u.openId}</p>
                          </div>
                        </div>
                        <Select
                          value={u.role}
                          onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role: role as "user" | "admin" })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Säljare</SelectItem>
                            <SelectItem value="admin">FC / Säljchef</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tilldela {selectedCompanyIds.length} företag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Säljare</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj säljare..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u: any) => u.id !== user?.id).map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                  {users.length <= 1 && (
                    <SelectItem value={String(user?.id)}>
                      {user?.name} (mig själv)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Vecka</label>
              <Input
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                placeholder="t.ex. 2026-V09"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Avbryt</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assignMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {assignMutation.isPending ? "Tilldelar..." : "Tilldela"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
