import { useState } from "react";
import { format } from "date-fns";
import { Globe, Plus, Trash2, ShieldCheck, Copy, Check, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListDomains, useAddDomain, useDeleteDomain } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const domainSchema = z.object({
  name: z.string().min(3, "Domain name is too short").regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain name"),
});

const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const webhookUrl = `${apiBase}/api/webhook/email`;

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
    <div className="flex items-center justify-between group">
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{label}</div>
        <div className="font-mono text-sm text-foreground bg-muted px-3 py-2 rounded-md border border-border/50 break-all">{value}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-4 shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyToClipboard(value, field)}
        data-testid={`copy-${field}`}
      >
        {copiedField === field ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Domains</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Manage the custom domains you own to receive email directly in your inbox.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Domains List */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              Connected Domains
            </h2>
            
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {isLoadingDomains ? (
                <div className="divide-y divide-border">
                  {[1, 2].map(i => (
                    <div key={i} className="p-5 flex justify-between items-center">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : !domainsData?.domains?.length ? (
                <div className="p-8 text-center text-muted-foreground bg-muted/20">
                  No domains connected yet. Add your first domain below.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {domainsData.domains.map((domain) => (
                    <div key={domain.id} data-testid={`domain-row-${domain.id}`} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background hover:bg-muted/20 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-base font-medium text-foreground">{domain.name}</span>
                          {domain.active && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3.5 h-3.5" /> Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Added {format(new Date(domain.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto self-end"
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
            </div>
          </section>

          {/* Add Domain */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Add New Domain</h2>
            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
                        <FormControl>
                          <Input 
                            className="h-11 font-mono text-base bg-background" 
                            data-testid="input-domain-name" 
                            placeholder="example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="lg" className="h-11 w-full sm:w-auto px-8" disabled={addDomain.isPending} data-testid="button-add-domain">
                    {addDomain.isPending ? "Adding..." : (<><Plus className="w-5 h-5 mr-2" /> Add Domain</>)}
                  </Button>
                </form>
              </Form>
            </div>
          </section>
        </div>

        {/* Setup Instructions sidebar */}
        <div className="space-y-6">
          <div className="bg-secondary text-secondary-foreground rounded-xl p-6 shadow-sm border border-border">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Setup Guide
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-medium text-base mb-1">Webhook Configuration</h4>
                    <p className="text-sm text-secondary-foreground/80 mb-4">
                      In your mail provider (e.g. Hanami.run), set this as your webhook URL to route emails to this client.
                    </p>
                    <CopyRow label="Webhook URL" value={webhookUrl} field="webhook-url" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-background text-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-medium text-base mb-1">DNS Records</h4>
                    <p className="text-sm text-secondary-foreground/80 mb-4">
                      Ensure your domain has the correct MX and SPF records pointing to your mail provider.
                    </p>
                    <div className="bg-background rounded-md border border-border/50 overflow-hidden">
                      <table className="w-full text-sm text-left font-mono">
                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Type</th>
                            <th className="px-3 py-2 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          <tr className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-muted-foreground">MX</td>
                            <td className="px-3 py-2">mx1.hanami.run (10)</td>
                          </tr>
                          <tr className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-muted-foreground">MX</td>
                            <td className="px-3 py-2">mx2.hanami.run (20)</td>
                          </tr>
                          <tr className="hover:bg-muted/50">
                            <td className="px-3 py-2 text-muted-foreground">TXT (SPF)</td>
                            <td className="px-3 py-2 truncate max-w-[150px]" title="v=spf1 include:spf.hanami.run ~all">v=spf1 include...</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
