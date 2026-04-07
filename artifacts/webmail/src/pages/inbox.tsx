import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Copy, RefreshCw, Inbox, Shuffle, Mail, Check, Zap, ZapOff, Radio } from "lucide-react";
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

  const [addressInput, setAddressInput] = useState("");
  const [activeAddress, setActiveAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("webmail-address");
    if (saved) {
      setAddressInput(saved);
      setActiveAddress(saved);
    }
  }, []);

  const { data: domainsData } = useListDomains();

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

  const handleGetEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addressInput.trim()) return;
    let addr = addressInput.trim().toLowerCase();
    if (!addr.includes("@") && domainsData?.domains?.length) {
      addr = `${addr}@${domainsData.domains[0].name}`;
      setAddressInput(addr);
    }
    setActiveAddress(addr);
    localStorage.setItem("webmail-address", addr);
  };

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateRandom = () => {
    if (!domainsData?.domains?.length) {
      toast({
        title: "No domains configured",
        description: "Please add a domain first in the Domains page.",
        variant: "destructive",
      });
      return;
    }
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const prefix = Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const domain = domainsData.domains[0].name;
    const newAddr = `${prefix}@${domain}`;
    setAddressInput(newAddr);
    setActiveAddress(newAddr);
    localStorage.setItem("webmail-address", newAddr);
    toast({ title: "Generated!", description: `Monitoring ${newAddr}` });
  };

  const emails = emailsData?.emails ?? [];
  const unread = statsData?.unreadEmails ?? 0;

  return (
    <div className="h-full flex flex-col min-h-[100dvh]">
      {/* Top bar */}
      <div className="border-b border-border bg-card/70 backdrop-blur-sm px-4 md:px-8 py-3 shrink-0 sticky top-0 z-10">
        <form onSubmit={handleGetEmail} className="flex items-center gap-2 max-w-3xl">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="alias or full@address.com"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              className="pl-9 h-10 font-mono text-sm bg-background"
            />
          </div>
          <Button type="submit" variant="default" size="sm" className="h-10 px-4 shrink-0">
            Open
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleGenerateRandom}
            title="Generate random address"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
        <div className="max-w-3xl mx-auto space-y-6">
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
            <div className="flex flex-col items-center justify-center py-28 text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40 flex items-center justify-center mb-6 shadow-sm">
                <Mail className="w-9 h-9 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No inbox selected</h2>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                Enter an email alias or full address above, or hit the shuffle button to generate a random one instantly.
              </p>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center px-4">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Inbox className="w-9 h-9 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Inbox is empty</h2>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                Waiting for messages at{" "}
                <span className="font-mono text-foreground">{activeAddress}</span>. Emails will appear here automatically.
              </p>
              {autoRefresh && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-violet-500" />
                  Checking every 15 seconds
                </p>
              )}
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
