import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Copy, RefreshCw, Inbox, Shuffle, Check, Zap, ZapOff, Radio, ChevronDown, ArrowRight, Search, X } from "lucide-react";
import { useListEmails, useListDomains, useGetEmailStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const AUTO_REFRESH_INTERVAL = 15000;
const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";

export function InboxPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [alias, setAlias] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [activeAddress, setActiveAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [directInput, setDirectInput] = useState("");
  const esRef = useRef<EventSource | null>(null);
  const domainRef = useRef<HTMLDivElement>(null);

  const { data: domainsData } = useListDomains();
  const domains = domainsData?.domains ?? [];

  // Set default domain once domains load
  useEffect(() => {
    if (domains.length && !selectedDomain) {
      setSelectedDomain(domains[0].name);
    }
  }, [domains, selectedDomain]);

  // Restore last used address
  useEffect(() => {
    const saved = localStorage.getItem("webmail-address");
    if (saved && saved.includes("@")) {
      const [savedAlias, savedDomain] = saved.split("@");
      setAlias(savedAlias);
      setSelectedDomain(savedDomain);
      setActiveAddress(saved);
    }
  }, []);

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

  const openInbox = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const domain = selectedDomain || domains[0]?.name;
    if (!domain) return;
    const prefix = alias.trim().toLowerCase() || generatePrefix();
    const addr = `${prefix}@${domain}`;
    setAlias(prefix);
    setActiveAddress(addr);
    localStorage.setItem("webmail-address", addr);
  };

  const generatePrefix = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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
    localStorage.setItem("webmail-address", addr);
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
    localStorage.setItem("webmail-address", val);
    setDirectInput("");
  };

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allEmails = emailsData?.emails ?? [];
  const unread = statsData?.unreadEmails ?? 0;
  const emails = search.trim()
    ? allEmails.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.from?.toLowerCase().includes(q) ||
          e.subject?.toLowerCase().includes(q) ||
          e.preview?.toLowerCase().includes(q)
        );
      })
    : allEmails;

  return (
    <div className="h-full flex flex-col min-h-[100dvh]">
      {/* Top bar */}
      <div className="border-b border-border bg-card/70 backdrop-blur-sm px-4 md:px-8 py-3 shrink-0 sticky top-0 z-10">
        <form onSubmit={openInbox} className="flex items-center gap-2 max-w-3xl">
          {/* Alias input */}
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

          {/* Domain dropdown — outside the overflow container so it can render freely */}
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

          {/* Arrow submit */}
          <Button type="submit" variant="default" size="icon" className="h-10 w-10 shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-transparent">
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* Shuffle */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleShuffle}
            title="Generate random alias"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Access any inbox */}
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

          {/* Header row */}
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
                  title={autoRefresh ? "Auto-refresh ON (every 15s)" : "Enable auto-refresh"}
                >
                  {autoRefresh ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{autoRefresh ? "Auto ON" : "Auto OFF"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={doRefetch}
                  disabled={isLoadingEmails || isRefetching}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            )}
          </div>

          {/* Search bar — only show when inbox is active */}
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
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Email list */}
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
                        localStorage.setItem("webmail-address", addr);
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
                Waiting for messages at{" "}
                <span className="font-mono text-foreground">{activeAddress}</span>. Emails will appear here instantly.
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
              <button onClick={() => setSearch("")} className="text-sm text-violet-600 dark:text-violet-400 hover:underline mt-1">
                Clear search
              </button>
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
                      {email.from?.charAt(0)?.match(/[a-z]/i)
                        ? email.from.charAt(0).toUpperCase()
                        : "?"}
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
