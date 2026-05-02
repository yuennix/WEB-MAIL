import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Copy, RefreshCw, Inbox, Shuffle, Check, Zap, ZapOff, Radio, ChevronDown, ArrowRight, Search, X, Crown, Trash2, Trash } from "lucide-react";
import { useListEmails, useListDomains, useGetEmailStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUserTier } from "@/hooks/use-user-tier";
import { useUser } from "@clerk/react";

const AUTO_REFRESH_INTERVAL = 15000;
const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";

const DOMAIN_COLORS = [
  { bg: "bg-violet-500", ring: "ring-violet-500", hex: "#8b5cf6" },
  { bg: "bg-emerald-500", ring: "ring-emerald-500", hex: "#10b981" },
  { bg: "bg-sky-500",     ring: "ring-sky-500",     hex: "#0ea5e9" },
  { bg: "bg-pink-500",    ring: "ring-pink-500",     hex: "#ec4899" },
  { bg: "bg-amber-500",   ring: "ring-amber-500",   hex: "#f59e0b" },
  { bg: "bg-slate-600",   ring: "ring-slate-600",   hex: "#475569" },
];

export function InboxPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { tier, allowedDomainIds, profile } = useUserTier();
  const { isSignedIn, isLoaded } = useUser();

  const [alias, setAlias] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeAddress, setActiveAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [directInput, setDirectInput] = useState("");
  const [clearing, setClearing] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const domainRef = useRef<HTMLDivElement>(null);

  const { data: domainsData } = useListDomains();
  const allDomains = domainsData?.domains ?? [];

  // Domain visibility rules:
  // - Free users: only non-premiumOnly domains
  // - Premium users with assigned domains: only their assigned domains
  // - Premium users with no assignments: all domains
  const domains = tier === "free"
    ? allDomains.filter(d => !d.premiumOnly)
    : allowedDomainIds.length > 0
      ? allDomains.filter(d => allowedDomainIds.includes(d.id))
      : allDomains;

  // Set / reset default domain when the visible list changes
  useEffect(() => {
    if (!domains.length) return;
    const stillValid = domains.some(d => d.name === selectedDomain);
    if (!stillValid) {
      setSelectedDomain(domains[0].name);
    }
  }, [domains]);

  // Close domain dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (domainRef.current && !domainRef.current.contains(e.target as Node)) {
        setDomainOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    refetch: refetchEmails,
    isRefetching,
  } = useListEmails(
    { address: activeAddress },
    {
      query: {
        enabled: !!activeAddress,
        queryKey: ["/api/emails", { address: activeAddress }],
      },
    }
  );

  const { data: statsData } = useGetEmailStats(
    { address: activeAddress },
    {
      query: {
        enabled: !!activeAddress,
        queryKey: ["/api/emails/stats", { address: activeAddress }],
      },
    }
  );

  const doRefetch = useCallback(() => {
    if (activeAddress) refetchEmails();
  }, [activeAddress, refetchEmails]);

  useEffect(() => {
    if (!autoRefresh || !activeAddress) return;
    const interval = setInterval(doRefetch, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, activeAddress, doRefetch]);

  // SSE real-time connection
  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setLiveConnected(false);
    }
    if (!activeAddress) return;

    const url = `${apiBase}/api/events?address=${encodeURIComponent(activeAddress)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("connected", () => setLiveConnected(true));

    es.addEventListener("new-email", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { to: string; id: number };
        if (data.to.toLowerCase() === activeAddress.toLowerCase()) {
          refetchEmails();
        }
      } catch {
        refetchEmails();
      }
    });

    es.onerror = () => setLiveConnected(false);

    return () => {
      es.close();
      esRef.current = null;
      setLiveConnected(false);
    };
  }, [activeAddress, refetchEmails]);

  const generatePrefix = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const openInbox = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const domain = selectedDomain || domains[0]?.name;
    if (!domain) return;
    const prefix = alias.trim().toLowerCase() || generatePrefix();
    const addr = `${prefix}@${domain}`;
    setAlias(prefix);
    setActiveAddress(addr);
  };

  const handleShuffle = () => {
    const domain = selectedDomain || domains[0]?.name;
    if (!domain) {
      toast({ title: "No domains available", variant: "destructive" });
      return;
    }
    const prefix = generatePrefix();
    const addr = `${prefix}@${domain}`;
    setAlias(prefix);
    setActiveAddress(addr);
  };

  const openDirectInbox = (e: React.FormEvent) => {
    e.preventDefault();
    const val = directInput.trim().toLowerCase();
    if (!val.includes("@")) {
      toast({ title: "Enter a full email address", description: "e.g. hello@weyn.store" });
      return;
    }
    const [a, d] = val.split("@");
    setAlias(a);
    setSelectedDomain(d);
    setActiveAddress(val);
    setSearch("");
    setDirectInput("");
  };

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearInbox = async () => {
    if (!activeAddress) return;
    if (!confirm(`Delete all messages in ${activeAddress}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      await fetch(`${apiBase}/api/emails?address=${encodeURIComponent(activeAddress)}`, { method: "DELETE" });
      refetchEmails();
    } catch {
      // silently ignore
    } finally {
      setClearing(false);
    }
  };

  const deleteInbox = async () => {
    if (!activeAddress) return;
    if (!confirm(`Delete inbox "${activeAddress}" and all its messages? You'll return to the inbox picker.`)) return;
    setClearing(true);
    try {
      await fetch(`${apiBase}/api/emails?address=${encodeURIComponent(activeAddress)}`, { method: "DELETE" });
    } catch {
      // silently ignore
    } finally {
      setClearing(false);
      setActiveAddress("");
      setAlias("");
    }
  };

  const allEmails = emailsData?.emails ?? [];
  const unread = statsData?.unreadEmails ?? 0;

  const isFacebookSender = (from: string) => /facebook/i.test(from);
  const hasSecurityCode = (e: { subject?: string; preview?: string }) =>
    /\b\d{6}\b/.test([e.subject, e.preview].join(" ")) ||
    /\b\d{8}\b/.test([e.subject, e.preview].join(" "));

  const tierFiltered =
    tier === "free"
      ? allEmails.filter(e => isFacebookSender(e.from ?? "") && hasSecurityCode(e))
      : allEmails;

  const emails = search.trim()
    ? tierFiltered.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.from?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.preview?.toLowerCase().includes(q)
        );
      })
    : tierFiltered;

  // ─── Premium view with assigned domains ────────────────────────────────────
  const isPremiumWithDomains = tier === "premium" && allowedDomainIds.length > 0 && domains.length > 0;

  if (isPremiumWithDomains) {
    const currentDomainIdx = Math.max(0, domains.findIndex(d => d.name === selectedDomain));
    const currentColor = DOMAIN_COLORS[currentDomainIdx % DOMAIN_COLORS.length];
    const displayAddress = activeAddress || (alias ? `${alias}@${selectedDomain || domains[0]?.name}` : "");
    const previewAddress = alias
      ? `${alias}@${selectedDomain || domains[0]?.name}`
      : selectedDomain || domains[0]?.name
        ? `your-alias@${selectedDomain || domains[0]?.name}`
        : "";

    return (
      <div className="h-full flex flex-col min-h-[100dvh] bg-background">
        {/* ── Hero card ── */}
        <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 px-6 pt-8 pb-6 text-white relative overflow-hidden">
          {/* subtle background pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px"
          }} />
          <div className="relative max-w-lg mx-auto">
            <p className="text-violet-200 text-xs font-semibold tracking-widest uppercase mb-1">Premium Mail Service</p>
            <h1 className="text-2xl font-bold tracking-tight">WEYN EMAILS</h1>
          </div>
        </div>

        {/* ── Domain selector dots ── */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="max-w-lg mx-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Your Domains</p>
            <div className="flex items-center gap-3 flex-wrap">
              {domains.map((d, idx) => {
                const color = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
                const isSelected = (selectedDomain || domains[0]?.name) === d.name;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDomain(d.name);
                      if (activeAddress) {
                        const newAddr = `${alias || generatePrefix()}@${d.name}`;
                        setActiveAddress(newAddr);
                        if (!alias) setAlias(newAddr.split("@")[0]);
                      }
                    }}
                    title={`@${d.name}`}
                    className={`w-9 h-9 rounded-full transition-all ${color.bg} ${
                      isSelected
                        ? `ring-2 ring-offset-2 ring-offset-card ${color.ring} scale-110 shadow-md`
                        : "opacity-50 hover:opacity-80"
                    }`}
                  />
                );
              })}
              <span className="text-xs font-mono text-muted-foreground ml-1">
                @{selectedDomain || domains[0]?.name}
              </span>
            </div>
          </div>
        </div>

        {/* ── Address + controls ── */}
        <div className="px-6 py-5 bg-background">
          <div className="max-w-lg mx-auto space-y-4">

            {/* Displayed address */}
            <button
              onClick={() => {
                if (!activeAddress) return;
                handleCopy();
              }}
              disabled={!activeAddress}
              className={`w-full rounded-xl border-2 border-dashed px-4 py-3.5 text-center transition-all group ${
                activeAddress
                  ? "border-violet-400 dark:border-violet-600 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 cursor-pointer"
                  : "border-border cursor-default"
              }`}
            >
              <p className={`font-mono font-semibold text-sm break-all ${activeAddress ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}>
                {activeAddress || previewAddress || "enter an alias below"}
              </p>
              {activeAddress && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  {copied
                    ? <><Check className="w-3 h-3 text-emerald-500" /> Copied!</>
                    : <><Copy className="w-3 h-3" /> Tap to copy</>
                  }
                </p>
              )}
            </button>

            {/* Alias input */}
            <Input
              type="text"
              placeholder="your-username…"
              value={alias}
              onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
              className="h-11 text-sm font-mono text-center bg-card border-border"
              onKeyDown={(e) => e.key === "Enter" && openInbox()}
            />

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={openInbox}
                className="h-11 font-bold tracking-wide bg-violet-600 hover:bg-violet-700 text-white border-transparent"
              >
                USE CUSTOM
              </Button>
              <Button
                variant="outline"
                onClick={handleShuffle}
                className="h-11 font-bold tracking-wide border-slate-300 dark:border-slate-700 text-foreground hover:bg-muted"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                RANDOM
              </Button>
            </div>
          </div>
        </div>

        {/* ── Live inbox ── */}
        <div className="flex-1 overflow-auto px-6 pb-8">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Live Inbox</h2>
                {liveConnected && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Live
                  </span>
                )}
                {unread > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeAddress && allEmails.length > 0 && (
                  <button
                    onClick={clearInbox}
                    disabled={clearing}
                    className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    {clearing ? "Clearing…" : "Clear"}
                  </button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs px-3 rounded-full border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                  onClick={doRefetch}
                  disabled={!activeAddress || isLoadingEmails || isRefetching}
                >
                  <RefreshCw className={`w-3 h-3 ${isRefetching ? "animate-spin" : ""}`} />
                  Update
                </Button>
              </div>
            </div>

            {/* Search */}
            {activeAddress && allEmails.length > 0 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 h-9 text-xs bg-card border-border"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Email list */}
            {isLoadingEmails ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activeAddress ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 flex flex-col items-center text-center px-4">
                <Inbox className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No inbox selected</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Enter an alias above and tap Use Custom or Random</p>
              </div>
            ) : allEmails.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-12 flex flex-col items-center text-center px-4">
                <Inbox className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">Inbox is empty</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Waiting for mail at <span className="font-mono text-foreground">{activeAddress}</span>
                </p>
                {liveConnected && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-500" />
                    Connected live — no refresh needed
                  </p>
                )}
              </div>
            ) : emails.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-10 flex flex-col items-center text-center px-4">
                <Search className="w-7 h-7 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">No results for "{search}"</p>
                <button onClick={() => setSearch("")} className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1">Clear search</button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={`cursor-pointer transition-all hover:bg-muted/40 flex gap-3 p-4 ${
                      !email.read ? "bg-violet-50/60 dark:bg-violet-950/20" : ""
                    }`}
                    onClick={() => setLocation(`/email/${email.id}?address=${encodeURIComponent(activeAddress)}`)}
                  >
                    <div className="relative shrink-0">
                      {!email.read && (
                        <span className="absolute -left-1 top-3 w-1.5 h-1.5 rounded-full bg-violet-500" />
                      )}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${
                          !email.read
                            ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {email.from?.charAt(0)?.match(/[a-z]/i) ? email.from.charAt(0).toUpperCase() : "?"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5 gap-2">
                        <span className={`truncate text-sm ${!email.read ? "font-semibold" : "font-medium text-foreground/80"}`}>
                          {email.from}
                        </span>
                        <span className={`text-[11px] whitespace-nowrap shrink-0 ${!email.read ? "text-violet-600 dark:text-violet-400 font-medium" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                        </span>
                      </div>
                      <div className={`text-xs mb-0.5 truncate ${!email.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                        {email.subject || "(No Subject)"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{email.preview || "No preview."}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Delete inbox button */}
            {activeAddress && (
              <button
                onClick={deleteInbox}
                disabled={clearing}
                className="mt-4 w-full text-xs text-muted-foreground/60 hover:text-red-400 transition-colors py-2 text-center"
              >
                {clearing ? "Deleting…" : "Delete this inbox"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Standard view (free users + premium with no domain restrictions) ───────
  return (
    <div className="h-full flex flex-col min-h-[100dvh]">
      {/* Top bar */}
      <div className="border-b border-border bg-card/70 backdrop-blur-sm px-4 md:px-8 py-3 shrink-0 sticky top-0 z-10">
        <form onSubmit={openInbox} className="flex items-center gap-2 max-w-3xl">
          <div className="flex flex-1 items-center rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring min-w-0">
            <Input
              type="text"
              placeholder="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
              className="flex-1 border-0 shadow-none rounded-none focus-visible:ring-0 font-mono text-sm h-10 min-w-0"
            />
            <span className="px-2 text-sm text-muted-foreground font-mono select-none shrink-0 border-l border-input h-10 flex items-center bg-muted/30">
              @
            </span>
          </div>

          <div className="relative shrink-0" ref={domainRef}>
            <button
              type="button"
              onClick={() => setDomainOpen(!domainOpen)}
              className="flex items-center gap-1.5 h-10 px-3 font-mono text-sm text-foreground bg-background border border-input rounded-md hover:bg-muted/60 transition-colors shadow-sm"
            >
              {selectedDomain || (domains[0]?.name ?? "…")}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${domainOpen ? "rotate-180" : ""}`} />
            </button>
            {domainOpen && domains.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden">
                {domains.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 font-mono text-sm hover:bg-muted transition-colors ${
                      selectedDomain === d.name
                        ? "text-violet-600 dark:text-violet-400 font-semibold bg-violet-50 dark:bg-violet-950/30"
                        : "text-foreground"
                    }`}
                    onClick={() => {
                      setSelectedDomain(d.name);
                      setDomainOpen(false);
                    }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" variant="default" size="icon" className="h-10 w-10 shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-transparent">
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={handleShuffle} title="Generate random alias">
            <Shuffle className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Access any inbox</p>
            <form onSubmit={openDirectInbox} className="flex gap-2">
              <Input
                type="email"
                placeholder="anything@weyn.store"
                value={directInput}
                onChange={(e) => setDirectInput(e.target.value)}
                className="flex-1 font-mono text-sm h-10"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-transparent">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {tier === "free" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5">
              <Crown className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                <span className="font-semibold">Free plan</span> — Facebook verification codes only (6 &amp; 8-digit).
              </p>
              {!isSignedIn && (
                <button
                  onClick={() => setLocation("/sign-in")}
                  className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline shrink-0 whitespace-nowrap"
                >
                  Sign in for Premium →
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
              {activeAddress && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground bg-muted/60 border border-border rounded px-2.5 py-1">
                    {activeAddress}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border transition-all ${
                      copied
                        ? "bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy Email"}
                  </button>
                  {unread > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                      {unread} new
                    </span>
                  )}
                </div>
              )}
            </div>

            {activeAddress && (
              <div className="flex items-center gap-2">
                {liveConnected && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Live
                  </span>
                )}
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  className={`h-9 gap-2 ${autoRefresh ? "bg-violet-600 hover:bg-violet-700 text-white border-transparent" : ""}`}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{autoRefresh ? "Auto ON" : "Auto OFF"}</span>
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={doRefetch} disabled={isLoadingEmails || isRefetching}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {allEmails.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={clearInbox}
                    disabled={clearing}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{clearing ? "Clearing…" : "Clear"}</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100"
                  onClick={deleteInbox}
                  disabled={clearing}
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{clearing ? "Deleting…" : "Delete Inbox"}</span>
                </Button>
              </div>
            )}
          </div>

          {activeAddress && allEmails.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by sender, subject or content…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10 bg-card border-border text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {isLoadingEmails ? (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activeAddress ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40 flex items-center justify-center mb-6 shadow-sm">
                <Inbox className="w-9 h-9 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Pick an inbox</h2>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-6">
                Type any alias above and choose a domain — or hit the shuffle button to get a random address instantly.
              </p>
              {domains.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {domains.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDomain(d.name);
                        const prefix = generatePrefix();
                        const addr = `${prefix}@${d.name}`;
                        setAlias(prefix);
                        setActiveAddress(addr);
                      }}
                      className="px-4 py-2 rounded-full border border-border bg-card hover:bg-muted hover:border-violet-300 dark:hover:border-violet-700 transition-colors text-sm font-mono text-muted-foreground hover:text-foreground"
                    >
                      @{d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : allEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Inbox className="w-9 h-9 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Inbox is empty</h2>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                Waiting for messages at <span className="font-mono text-foreground">{activeAddress}</span>. Emails will appear here instantly.
              </p>
              {liveConnected && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-emerald-500" />
                  Connected live — no refresh needed
                </p>
              )}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Search className="w-8 h-8 text-muted-foreground/40 mb-4" />
              <h2 className="text-base font-semibold mb-1">No results for "{search}"</h2>
              <button onClick={() => setSearch("")} className="text-sm text-violet-600 dark:text-violet-400 hover:underline mt-1">Clear search</button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={`group cursor-pointer transition-all hover:bg-muted/40 flex gap-4 p-4 ${
                    !email.read ? "bg-violet-50/60 dark:bg-violet-950/20 hover:bg-violet-50 dark:hover:bg-violet-950/30" : ""
                  }`}
                  onClick={() => setLocation(`/email/${email.id}?address=${encodeURIComponent(activeAddress)}`)}
                >
                  <div className="hidden sm:flex shrink-0 relative">
                    {!email.read && (
                      <span className="absolute -left-5 top-3.5 w-2 h-2 rounded-full bg-violet-500" />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm mt-0.5 ${
                        !email.read
                          ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {email.from?.charAt(0)?.match(/[a-z]/i) ? email.from.charAt(0).toUpperCase() : "?"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1 gap-2">
                      <span className={`truncate text-sm ${!email.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                        {email.from}
                      </span>
                      <span className={`text-xs whitespace-nowrap shrink-0 ${!email.read ? "text-violet-600 dark:text-violet-400 font-medium" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                      </span>
                    </div>
                    <div className={`text-sm mb-1 truncate ${!email.read ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                      {email.subject || "(No Subject)"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{email.preview || "No preview available."}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
