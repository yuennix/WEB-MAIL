import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Copy, RefreshCw, Inbox, Command, ArrowRight } from "lucide-react";
import { useListEmails, useListDomains, useGetEmailStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function InboxPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [addressInput, setAddressInput] = useState("");
  const [activeAddress, setActiveAddress] = useState("");
  
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
    isRefetching
  } = useListEmails(
    { address: activeAddress }, 
    { 
      query: { 
        enabled: !!activeAddress,
        queryKey: ["/api/emails", { address: activeAddress }]
      } 
    }
  );

  const { data: statsData } = useGetEmailStats(
    { address: activeAddress },
    { 
      query: { 
        enabled: !!activeAddress,
        queryKey: ["/api/emails/stats", { address: activeAddress }]
      }
    }
  );

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
    toast({
      title: "Address copied",
      description: "Email address copied to clipboard",
    });
  };

  const handleGenerateRandom = () => {
    if (!domainsData?.domains?.length) {
      toast({
        title: "No domains configured",
        description: "Please add a domain first in settings.",
        variant: "destructive"
      });
      return;
    }
    
    const randomPrefix = Math.random().toString(36).substring(2, 8);
    const domain = domainsData.domains[0].name;
    const newAddr = `${randomPrefix}@${domain}`;
    
    setAddressInput(newAddr);
    setActiveAddress(newAddr);
    localStorage.setItem("webmail-address", newAddr);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Command Bar */}
      <div className="border-b border-border bg-card/50 px-4 md:px-8 py-4 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10">
        <form onSubmit={handleGetEmail} className="flex-1 flex items-center gap-2 max-w-2xl w-full">
          <div className="relative flex-1 group">
            <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              type="text" 
              placeholder="Enter alias (e.g. hello) or full address" 
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              className="pl-9 h-10 bg-background border-input shadow-sm focus-visible:ring-1 focus-visible:ring-primary rounded-md font-mono text-sm"
            />
            {addressInput && addressInput !== activeAddress && (
              <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary">
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={handleGenerateRandom} title="Generate Random">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </form>

        {activeAddress && (
          <div className="flex items-center gap-4 text-sm w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Monitoring:</span>
              <button onClick={handleCopy} className="font-mono bg-muted px-2 py-1 rounded text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1 group">
                {activeAddress}
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            {statsData && statsData.unreadEmails > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {statsData.unreadEmails} new
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Inbox Area */}
      <div className="flex-1 overflow-auto bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h1>
            {activeAddress && (
              <Button variant="ghost" size="sm" onClick={() => refetchEmails()} disabled={isLoadingEmails || isRefetching} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingEmails || isRefetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
          </div>

          {isLoadingEmails ? (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activeAddress ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                <Command className="w-8 h-8 text-primary/40" />
              </div>
              <h2 className="text-xl font-medium mb-2">No address selected</h2>
              <p className="text-muted-foreground max-w-md">
                Enter an email address in the command bar above or generate a random one to start receiving mail.
              </p>
            </div>
          ) : emailsData?.emails?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                <Inbox className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-xl font-medium mb-2">Your inbox is clear</h2>
              <p className="text-muted-foreground max-w-md">
                Waiting for messages to arrive at <span className="font-mono text-foreground">{activeAddress}</span>. New emails will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border bg-card shadow-sm">
              {emailsData?.emails?.map((email) => (
                <div 
                  key={email.id} 
                  className={`group cursor-pointer transition-colors hover:bg-muted/50 flex gap-4 p-4 ${!email.read ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                  onClick={() => setLocation(`/email/${email.id}?address=${encodeURIComponent(activeAddress)}`)}
                >
                  <div className="hidden sm:flex shrink-0 pt-1 relative">
                    {!email.read && <div className="absolute -left-4 top-3 w-2 h-2 rounded-full bg-primary" />}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm ${!email.read ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {email.from.charAt(0).match(/[a-z]/i) ? email.from.charAt(0).toUpperCase() : '?'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1 gap-2">
                      <div className={`truncate pr-4 ${!email.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                        {email.from}
                      </div>
                      <div className={`text-xs whitespace-nowrap shrink-0 ${!email.read ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                      </div>
                    </div>
                    <div className={`text-sm mb-1 truncate ${!email.read ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>
                      {email.subject || '(No Subject)'}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {email.preview || 'No preview available.'}
                    </div>
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
