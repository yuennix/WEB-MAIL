import { useState } from "react";
import { format } from "date-fns";
import { Globe, Plus, Trash2, ShieldCheck, Copy, Check, Webhook } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListDomains, useAddDomain, useDeleteDomain } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const domainSchema = z.object({
  name: z.string().min(3, "Domain name is too short").regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain name"),
});

const webhookUrl = `${window.location.origin}/api/webhook/email`;

export function DomainsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: domainsData, isLoading: isLoadingDomains } = useListDomains();
  const addDomain = useAddDomain();
  const deleteDomain = useDeleteDomain();

  const form = useForm<z.infer<typeof domainSchema>>({
    resolver: zodResolver(domainSchema),
    defaultValues: { name: "" },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onSubmit = (values: z.infer<typeof domainSchema>) => {
    addDomain.mutate(
      { data: { name: values.name.toLowerCase() } },
      {
        onSuccess: () => {
          toast({ title: "Domain added", description: `${values.name} has been added successfully.` });
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
        },
        onError: (error) => {
          toast({ title: "Failed to add domain", description: error.error || "An unexpected error occurred.", variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    deleteDomain.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Domain removed", description: `${name} has been removed.` });
          queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
        },
        onError: (error) => {
          toast({ title: "Failed to remove domain", description: error.error || "An unexpected error occurred.", variant: "destructive" });
        }
      }
    );
  };

  const CopyRow = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="text-sm font-mono font-medium break-all">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-2 shrink-0 h-7 w-7"
        onClick={() => copyToClipboard(value, field)}
        data-testid={`copy-${field}`}
      >
        {copiedField === field ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Domains</h1>
        <p className="text-muted-foreground">
          Connect your domain to start receiving emails in your inbox.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Domains</CardTitle>
              <CardDescription>Domains currently configured to receive mail.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDomains ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-md" />
                        <div><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-3 w-24" /></div>
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))}
                </div>
              ) : !domainsData?.domains?.length ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  No domains connected yet. Add one below.
                </div>
              ) : (
                <div className="space-y-3">
                  {domainsData.domains.map((domain) => (
                    <div key={domain.id} data-testid={`domain-row-${domain.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {domain.name}
                            {domain.active && (
                              <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Added {format(new Date(domain.createdAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 sm:self-auto self-end"
                        onClick={() => handleDelete(domain.id, domain.name)}
                        disabled={deleteDomain.isPending}
                        data-testid={`delete-domain-${domain.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Domain</CardTitle>
              <CardDescription>Register a domain name to receive emails on it.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input data-testid="input-domain-name" placeholder="e.g. yourdomain.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={addDomain.isPending} data-testid="button-add-domain">
                    {addDomain.isPending ? "Adding..." : (<><Plus className="w-4 h-4 mr-2" /> Add</>)}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
            <Webhook className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700 dark:text-blue-400 font-semibold">Step 1 — Configure Mailwip Webhook</AlertTitle>
            <AlertDescription className="text-sm mt-2 space-y-3">
              <p className="text-muted-foreground">In your Mailwip (Hanami.run) dashboard, go to your domain, open the <strong>Webhook</strong> tab, and paste this URL:</p>
              <div className="bg-white dark:bg-slate-900 rounded-md border p-2">
                <CopyRow label="Webhook URL" value={webhookUrl} field="webhook-url" />
              </div>
              <p className="text-xs text-muted-foreground">Set the email filter to <strong>*</strong> (wildcard) to receive all emails. No custom headers needed.</p>
            </AlertDescription>
          </Alert>

          <Alert className="border-slate-200 bg-slate-50 dark:bg-slate-950/30">
            <Globe className="h-4 w-4 text-slate-500" />
            <AlertTitle className="font-semibold text-slate-700 dark:text-slate-300">Step 2 — Verify DNS Records</AlertTitle>
            <AlertDescription className="text-sm mt-3 space-y-3">
              <p className="text-muted-foreground">Your MX and SPF records look correct based on your screenshot. Confirm these are set:</p>
              <div className="bg-white dark:bg-slate-900 rounded-md border divide-y text-xs font-mono">
                <div className="grid grid-cols-3 gap-1 p-2">
                  <span className="text-muted-foreground">MX</span>
                  <span>@</span>
                  <span>mx1.hanami.run (10)</span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-2">
                  <span className="text-muted-foreground">MX</span>
                  <span>@</span>
                  <span>mx2.hanami.run (20)</span>
                </div>
                <div className="grid grid-cols-3 gap-1 p-2 break-all">
                  <span className="text-muted-foreground">TXT</span>
                  <span>@</span>
                  <span>v=spf1 include:spf.hanami.run ~all</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Your DNS already looks correct. Once the webhook is configured, emails will arrive here in real time.</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
