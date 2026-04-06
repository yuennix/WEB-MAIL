import React, { useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Paperclip, Download, User } from "lucide-react";
import { format } from "date-fns";
import { useGetEmail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function EmailDetailPage() {
  const [, params] = useRoute("/email/:id");
  const [, setLocation] = useLocation();
  const id = params?.id;
  
  // Extract address from query params
  const searchParams = new URLSearchParams(window.location.search);
  const address = searchParams.get("address") || "";
  
  const { data: email, isLoading } = useGetEmail(
    id as string,
    { address },
    { 
      query: { 
        enabled: !!id && !!address,
        queryKey: ["/api/emails", id, { address }] 
      }
    }
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (email?.htmlBody && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(email.htmlBody);
        doc.close();
        
        // Auto-resize iframe based on content
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.style.height = `${iframeRef.current.contentWindow.document.documentElement.scrollHeight}px`;
          }
        }, 100);
      }
    }
  }, [email?.htmlBody]);

  if (isLoading || !email) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" disabled className="gap-2 -ml-3">
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Button>
        <Card>
          <CardHeader className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-4 items-center">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/")}
        className="gap-2 -ml-3 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </Button>
      
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="p-6 md:p-8 bg-muted/10 border-b">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            {email.subject || '(No Subject)'}
          </h1>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                <div className="font-semibold text-base truncate">
                  {email.from}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(email.date), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="opacity-70">to</span> <span className="font-medium text-foreground/80">{email.to}</span>
              </div>
            </div>
          </div>
        </div>

        {email.attachments && email.attachments.length > 0 && (
          <div className="bg-muted/5 p-4 border-b px-6 md:px-8 flex flex-wrap gap-2">
            {email.attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 bg-background border rounded-md p-2 text-sm max-w-[200px]">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1" title={att.filename}>{att.filename}</span>
                <span className="text-xs text-muted-foreground shrink-0">{Math.round(att.size / 1024)}kb</span>
              </div>
            ))}
          </div>
        )}

        <CardContent className="p-0">
          <div className="min-h-[400px] w-full p-6 md:p-8 bg-background">
            {email.htmlBody ? (
              <iframe
                ref={iframeRef}
                title="Email Content"
                className="w-full border-0 transition-all duration-300"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                scrolling="no"
              />
            ) : (
              <div className="whitespace-pre-wrap font-mono text-sm text-foreground/90 leading-relaxed max-w-full overflow-x-auto">
                {email.textBody || 'No content.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
