import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, Users, Mail, Linkedin, Loader2,
  Building2, Copy, Send, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Phone, Calendar, MessageSquare, FileText, Clock, Plus, Activity
} from "lucide-react";
import { classifyTitle, decisionMakerLabels } from "@shared/targeting";

const focusBadge: Record<string, string> = {
  AAA: "bg-red-100 text-red-800 border-red-200",
  AA: "bg-orange-100 text-orange-800 border-orange-200",
  A: "bg-yellow-100 text-yellow-800 border-yellow-200",
  B: "bg-blue-100 text-blue-800 border-blue-200",
  C: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusOptions = [
  { value: "new", label: "Ny" },
  { value: "contacted", label: "Kontaktad" },
  { value: "meeting", label: "Möte bokat" },
  { value: "qualified", label: "Kvalificerad" },
  { value: "lost", label: "Förlorad" },
];

const activityTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  call: { label: "Samtal", icon: <Phone className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700 border-blue-200" },
  email_sent: { label: "Mejl skickat", icon: <Mail className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700 border-purple-200" },
  email_replied: { label: "Svar mottaget", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-700 border-green-200" },
  email_opened: { label: "Mejl öppnat", icon: <Mail className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  meeting_booked: { label: "Möte bokat", icon: <Calendar className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-700 border-red-200" },
  note: { label: "Anteckning", icon: <FileText className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-700 border-gray-200" },
};

interface GeneratedEmail {
  id: number;
  subject: string;
  body: string;
  contactName?: string | null;
  contactTitle?: string | null;
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const companyId = parseInt(id || "0");

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [emailLanguage, setEmailLanguage] = useState<"sv" | "en">("sv");
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [showOnlyDecisionMakers, setShowOnlyDecisionMakers] = useState(true);

  // Activity log state
  const [newActivityType, setNewActivityType] = useState<string>("call");
  const [newActivityNote, setNewActivityNote] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  // Phone editing state
  const [editingPhoneId, setEditingPhoneId] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState("");

  const { user } = useAuth();
  const utils = trpc.useUtils();

  const updatePhoneMutation = trpc.contacts.updatePhone.useMutation({
    onSuccess: () => {
      utils.contacts.byCompany.invalidate({ companyId });
      setEditingPhoneId(null);
      setPhoneInput("");
      toast.success("Nummer sparat!");
    },
    onError: () => toast.error("Kunde inte spara numret"),
  });

  const { data: company, isLoading: loadingCompany } = trpc.companies.getById.useQuery({ id: companyId });
  const { data: contacts = [], isLoading: loadingContacts } = trpc.contacts.byCompany.useQuery({ companyId });
  const { data: emails = [] } = trpc.emails.byCompany.useQuery({ companyId });
  const { data: activities = [], isLoading: loadingActivities } = trpc.activities.byCompany.useQuery({ companyId });

  const updateStatusMutation = trpc.companies.updateStatus.useMutation({
    onSuccess: () => {
      utils.companies.getById.invalidate({ id: companyId });
      utils.companies.list.invalidate();
      toast.success("Status uppdaterad");
    },
  });

  const generateEmailMutation = trpc.emails.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedEmail(data);
      setEditedBody(data.body);
      utils.emails.byCompany.invalidate({ companyId });
      toast.success("Mejl genererat!");
    },
    onError: (err) => {
      toast.error("Kunde inte generera mejl: " + err.message);
    },
  });

  const updateEmailMutation = trpc.emails.updateStatus.useMutation({
    onSuccess: () => {
      utils.emails.byCompany.invalidate({ companyId });
      toast.success("Mejl markerat som skickat");
    },
  });

  const addActivityMutation = trpc.activities.add.useMutation({
    onSuccess: () => {
      utils.activities.byCompany.invalidate({ companyId });
      setNewActivityNote("");
      setAddingActivity(false);
      toast.success("Aktivitet loggad!");
    },
    onError: (err) => {
      toast.error("Kunde inte logga aktivitet: " + err.message);
    },
  });

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Företaget hittades inte</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">Tillbaka till dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const categoryRank: Record<string, number> = { tech: 0, procurement: 1, exec: 2 };
  const sortedContacts = [...contacts].sort((a, b) => {
    const ca = classifyTitle(a.title);
    const cb = classifyTitle(b.title);
    const ra = ca ? categoryRank[ca] : 99;
    const rb = cb ? categoryRank[cb] : 99;
    if (ra !== rb) return ra - rb;
    return (a.fullName || "").localeCompare(b.fullName || "");
  });
  const decisionMakerCount = sortedContacts.filter(c => classifyTitle(c.title) !== null).length;
  const filteredContacts = showOnlyDecisionMakers && decisionMakerCount > 0
    ? sortedContacts.filter(c => classifyTitle(c.title) !== null)
    : sortedContacts;
  const selectedContact = filteredContacts.find(c => c.id === selectedContactId) || filteredContacts[0] || null;
  const displayedContacts = showAllContacts ? filteredContacts : filteredContacts.slice(0, 4);

  const handleGenerateEmail = () => {
    if (!selectedContact) {
      toast.error("Välj en kontakt först");
      return;
    }
    generateEmailMutation.mutate({
      companyId,
      contactId: selectedContact.id,
      contactName: selectedContact.fullName || `${selectedContact.firstName} ${selectedContact.lastName}`.trim(),
      contactTitle: selectedContact.title || "",
      companyName: company.name,
      companyCategory: company.category || undefined,
      companyFocus: company.focus || undefined,
      companyDescription: company.description || undefined,
      language: emailLanguage,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopierat till urklipp!");
  };

  const handleAddActivity = () => {
    addActivityMutation.mutate({
      companyId,
      type: newActivityType as any,
      description: newActivityNote || undefined,
      performedBy: user?.name || user?.email || undefined,
    });
  };

  const formatActivityDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Idag " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Igår " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Tillbaka
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{company.name}</h1>
              {company.focus && (
                <Badge className={`border ${focusBadge[company.focus] || focusBadge.C}`}>
                  {company.focus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {[company.city, company.country].filter(Boolean).join(", ") || "—"}
            </p>
          </div>
          <Select
            value={company.status}
            onValueChange={(val) => updateStatusMutation.mutate({ id: companyId, status: val as any })}
          >
            <SelectTrigger className="w-40 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Company Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Företagsinformation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.industry && (
                <div>
                  <p className="text-xs text-gray-400">Bransch</p>
                  <p className="text-sm font-medium">{company.industry}</p>
                </div>
              )}
              {company.category && (
                <div>
                  <p className="text-xs text-gray-400">Kategori</p>
                  <p className="text-sm font-medium">{company.category}</p>
                </div>
              )}
              {company.employeeRange && (
                <div>
                  <p className="text-xs text-gray-400">Storlek</p>
                  <p className="text-sm font-medium">{company.employeeRange}</p>
                </div>
              )}
              {company.domain && (
                <div>
                  <p className="text-xs text-gray-400">Domän</p>
                  <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                    {company.domain} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {company.linkedinUrl && (
                <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Beskrivning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">
                {company.description || "Ingen beskrivning tillgänglig."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-500" />
                Aktivitetslogg
                {activities.length > 0 && (
                  <span className="text-sm font-normal text-gray-400">({activities.length})</span>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddingActivity(!addingActivity)}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Logga aktivitet
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add activity form */}
            {addingActivity && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                <p className="text-sm font-medium text-gray-700">Ny aktivitet</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={newActivityType} onValueChange={setNewActivityType}>
                    <SelectTrigger className="w-full sm:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 Samtal</SelectItem>
                      <SelectItem value="email_sent">📧 Mejl skickat</SelectItem>
                      <SelectItem value="email_replied">💬 Svar mottaget</SelectItem>
                      <SelectItem value="email_opened">👁 Mejl öppnat</SelectItem>
                      <SelectItem value="meeting_booked">📅 Möte bokat</SelectItem>
                      <SelectItem value="note">📝 Anteckning</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Anteckning (valfritt)..."
                    value={newActivityNote}
                    onChange={e => setNewActivityNote(e.target.value)}
                    className="flex-1"
                    onKeyDown={e => { if (e.key === "Enter") handleAddActivity(); }}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setAddingActivity(false)}>
                    Avbryt
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleAddActivity}
                    disabled={addActivityMutation.isPending}
                  >
                    {addActivityMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Sparar...</>
                    ) : (
                      "Spara"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Activity timeline */}
            {loadingActivities ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Inga aktiviteter loggade ännu</p>
                <p className="text-xs mt-1">Klicka "Logga aktivitet" för att börja</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(activities as any[]).map((activity) => {
                  const config = activityTypeConfig[activity.type] || activityTypeConfig.note;
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${config.color}`}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {activity.description ? (
                          <p className="text-sm text-gray-800">{activity.description}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">{config.label}</p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{formatActivityDate(activity.createdAt)}</span>
                          {activity.performedBy && (
                            <span className="text-xs text-gray-400">· {activity.performedBy}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                Kontakter ({filteredContacts.length}{showOnlyDecisionMakers && decisionMakerCount > 0 && decisionMakerCount < contacts.length ? ` av ${contacts.length}` : ""})
              </CardTitle>
              {decisionMakerCount > 0 && decisionMakerCount < contacts.length && (
                <button
                  onClick={() => setShowOnlyDecisionMakers(v => !v)}
                  className={`text-xs font-medium px-2.5 py-1 rounded border transition-colors ${
                    showOnlyDecisionMakers
                      ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                  title={showOnlyDecisionMakers ? "Visa alla kontakter" : "Visa endast beslutsfattare"}
                >
                  {showOnlyDecisionMakers ? `Endast beslutsfattare (${decisionMakerCount})` : `Visa alla (${contacts.length})`}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingContacts ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : contacts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Inga kontakter hittades</p>
            ) : (
              <div className="space-y-3">
                {displayedContacts.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      (selectedContactId === contact.id || (!selectedContactId && contact.id === contacts[0]?.id))
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm text-gray-900">{contact.fullName || `${contact.firstName} ${contact.lastName}`.trim()}</p>
                          {(() => {
                            const cat = classifyTitle(contact.title);
                            if (!cat) return null;
                            const meta = decisionMakerLabels[cat];
                            return (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${meta.color}`}>
                                {meta.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{contact.title || "—"}</p>
                        {contact.location && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            {contact.location}
                          </p>
                        )}
                        {contact.email && (
                          <p className="text-xs text-blue-600 truncate mt-0.5">{contact.email}</p>
                        )}
                        {/* Phone number row */}
                        {editingPhoneId === contact.id ? (
                          <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                            <Input
                              value={phoneInput}
                              onChange={e => setPhoneInput(e.target.value)}
                              placeholder="+46 70 000 00 00"
                              className="h-6 text-xs px-2 w-32"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === "Enter") updatePhoneMutation.mutate({ contactId: contact.id, phone: phoneInput });
                                if (e.key === "Escape") { setEditingPhoneId(null); setPhoneInput(""); }
                              }}
                            />
                            <button
                              onClick={() => updatePhoneMutation.mutate({ contactId: contact.id, phone: phoneInput })}
                              disabled={updatePhoneMutation.isPending}
                              className="text-xs text-green-700 hover:text-green-900 font-medium"
                            >
                              Spara
                            </button>
                            <button
                              onClick={() => { setEditingPhoneId(null); setPhoneInput(""); }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Avbryt
                            </button>
                          </div>
                        ) : contact.phone ? (
                          <div className="flex items-center gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                            <Phone className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <span className="text-xs text-green-700 font-medium">{contact.phone}</span>
                            <button
                              onClick={() => { copyToClipboard(contact.phone!); }}
                              className="p-0.5 hover:bg-gray-100 rounded"
                              title="Kopiera nummer"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                            <button
                              onClick={() => { setEditingPhoneId(contact.id); setPhoneInput(contact.phone || ""); }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Ändra
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-gray-400 italic">Mobilnummer saknas</span>
                            <button
                              onClick={() => {
                                const name = encodeURIComponent(contact.fullName || `${contact.firstName} ${contact.lastName}`.trim());
                                const companyName = encodeURIComponent(company?.name || "");
                                window.open(`https://www.lusha.com/people-search/?name=${name}&company=${companyName}`, "_blank");
                              }}
                              className="flex items-center gap-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5 hover:bg-orange-100 transition-colors font-medium"
                              title="Sök mobilnummer i Lusha"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Hämta via Lusha
                            </button>
                            <button
                              onClick={() => { setEditingPhoneId(contact.id); setPhoneInput(""); }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                              title="Ange nummer manuellt"
                            >
                              + Ange
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {contact.linkedinUrl && (
                          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1 hover:bg-blue-100 rounded">
                            <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                          </a>
                        )}
                        {contact.email && (
                          <button onClick={e => { e.stopPropagation(); copyToClipboard(contact.email!); }}
                            className="p-1 hover:bg-gray-100 rounded">
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {contacts.length > 4 && (
                  <button
                    onClick={() => setShowAllContacts(!showAllContacts)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-2"
                  >
                    {showAllContacts ? (
                      <><ChevronUp className="w-4 h-4" />Visa färre</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" />Visa alla {contacts.length} kontakter</>
                    )}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Email Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-500" />
              AI Mejlgenerator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Vald kontakt:</p>
                <p className="font-medium text-sm">
                  {selectedContact
                    ? `${selectedContact.fullName || `${selectedContact.firstName} ${selectedContact.lastName}`.trim()} — ${selectedContact.title || "Okänd titel"}`
                    : "Välj en kontakt ovan"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Språk:</p>
                <Select value={emailLanguage} onValueChange={(v) => setEmailLanguage(v as "sv" | "en")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sv">Svenska</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:pt-5">
                <Button
                  onClick={handleGenerateEmail}
                  disabled={generateEmailMutation.isPending || !selectedContact}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {generateEmailMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Genererar...</>
                  ) : generatedEmail ? (
                    <><RefreshCw className="w-4 h-4 mr-2" />Generera nytt</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" />Generera mejl</>
                  )}
                </Button>
              </div>
            </div>
            {generatedEmail && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Ämne:</p>
                    <p className="font-medium text-sm">{generatedEmail.subject}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedEmail.subject)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="p-4">
                  <Textarea
                    value={editedBody}
                    onChange={e => setEditedBody(e.target.value)}
                    className="min-h-[200px] text-sm border-0 p-0 resize-none focus-visible:ring-0"
                  />
                </div>
                <div className="bg-gray-50 px-4 py-2 border-t flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(`Ämne: ${generatedEmail.subject}\n\n${editedBody}`)}>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Kopiera allt
                  </Button>
                  {selectedContact?.email && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        window.open(`mailto:${selectedContact.email}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(editedBody)}`);
                        updateEmailMutation.mutate({ id: generatedEmail.id, status: "sent", editedBody });
                        const recipient = selectedContact.fullName || `${selectedContact.firstName ?? ""} ${selectedContact.lastName ?? ""}`.trim() || selectedContact.email;
                        addActivityMutation.mutate({
                          companyId,
                          contactId: selectedContact.id,
                          type: "email_sent",
                          description: `Mejl till ${recipient}: ${generatedEmail.subject}`,
                          performedBy: user?.name || user?.email || undefined,
                        });
                      }}>
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Öppna i mejlklient
                    </Button>
                  )}
                </div>
              </div>
            )}
            {/* Previous emails */}
            {emails.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Tidigare genererade mejl ({emails.length})</p>
                <div className="space-y-2">
                  {emails.slice(0, 3).map(email => (
                    <div key={email.id} className="p-2 bg-gray-50 rounded text-xs flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{email.subject}</span>
                        <span className="text-gray-400">{email.contactName} · {new Date(email.createdAt).toLocaleDateString("sv-SE")}</span>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {email.status === "draft" ? "Utkast" : email.status === "sent" ? "Skickat" : email.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
