import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Copy, RefreshCw, Inbox, MailOpen, Trash2 } from "lucide-react";
import { useListEmails, useListDomains, useGetEmailStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function InboxPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [addressInput, setAddressInput] = useState("");
  const [activeAddress, setActiveAddress] = useState("");
  
  // Try to load address from local storage on mount
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
    refetch: refetchEmails 
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
    
    // If no domain provided and we have domains, append the first one
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
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-primary/10 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleGetEmail} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MailOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Enter email address (e.g. hello@yourdomain.com)" 
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="lg" className="h-12 px-6">
                Get Email
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={handleCopy} title="Copy Address">
                <Copy className="w-5 h-5" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={handleGenerateRandom} title="Generate Random">
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          </form>
          
          {statsData && activeAddress && (
            <div className="mt-4 flex items-center text-sm text-muted-foreground gap-4">
              <span>Status: <span className="text-foreground font-medium">Checking {activeAddress}</span></span>
              {statsData.unreadEmails > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                  {statsData.unreadEmails} unread
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Inbox</h2>
          {activeAddress && (
            <Button variant="ghost" size="sm" onClick={() => refetchEmails()} disabled={isLoadingEmails}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingEmails ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>

        {isLoadingEmails ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !activeAddress ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg mb-2">Enter an email address</CardTitle>
              <CardDescription>
                Type an address above or generate a random one to start receiving emails.
              </CardDescription>
            </CardContent>
          </Card>
        ) : emailsData?.emails?.length === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg mb-2">Inbox is empty</CardTitle>
              <CardDescription>
                Waiting for messages to arrive at {activeAddress}...
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {emailsData?.emails?.map((email) => (
              <Card 
                key={email.id} 
                className={`cursor-pointer transition-colors hover:border-primary/50 hover:shadow-md ${!email.read ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => setLocation(`/email/${email.id}?address=${encodeURIComponent(activeAddress)}`)}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                  <div className="hidden sm:flex shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold uppercase">
                      {email.from.charAt(0).match(/[a-z]/i) ? email.from.charAt(0) : '?'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium truncate pr-4 text-foreground">
                        {email.from}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap pt-1">
                        {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                      </div>
                    </div>
                    <div className={`text-sm mb-1 truncate ${!email.read ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>
                      {email.subject || '(No Subject)'}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {email.preview || 'No preview available.'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
