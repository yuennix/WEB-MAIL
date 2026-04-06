import React from "react";
import { format } from "date-fns";
import { Globe, Plus, Trash2, ShieldCheck, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListDomains, useAddDomain, useDeleteDomain } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const domainSchema = z.object({
  name: z.string().min(3, "Domain name is too short").regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain name"),
});

export function DomainsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: domainsData, isLoading: isLoadingDomains } = useListDomains();
  const addDomain = useAddDomain();
  const deleteDomain = useDeleteDomain();

  const form = useForm<z.infer<typeof domainSchema>>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: z.infer<typeof domainSchema>) => {
    addDomain.mutate(
      { data: { name: values.name.toLowerCase() } },
      {
        onSuccess: () => {
          toast({
            title: "Domain added",
            description: `${values.name} has been added successfully.`,
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
        },
        onError: (error) => {
          toast({
            title: "Failed to add domain",
            description: error.error || "An unexpected error occurred.",
            variant: "destructive",
          });
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
          toast({
            title: "Domain removed",
            description: `${name} has been removed.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
        },
        onError: (error) => {
          toast({
            title: "Failed to remove domain",
            description: error.error || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Domains</h1>
        <p className="text-muted-foreground">
          Manage the custom domains you use to receive email.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Domains</CardTitle>
              <CardDescription>
                Domains currently configured to receive mail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDomains ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-md" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </div>
                  ))}
                </div>
              ) : domainsData?.domains?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  No domains connected yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {domainsData?.domains?.map((domain) => (
                    <div key={domain.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors gap-4">
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
              <CardDescription>
                Register a new domain to receive emails on it.
              </CardDescription>
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
                          <Input placeholder="e.g. example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={addDomain.isPending}>
                    {addDomain.isPending ? "Adding..." : (
                      <>
                        <Plus className="w-4 h-4 mr-2" /> Add
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-semibold">DNS Setup Required</AlertTitle>
            <AlertDescription className="text-sm mt-2 space-y-4">
              <p>To receive emails, you must configure your domain's DNS records.</p>
              
              <div className="space-y-2">
                <p className="font-medium text-foreground">1. Add an MX Record</p>
                <div className="bg-background p-3 rounded border text-xs font-mono space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type:</span> <span>MX</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Host:</span> <span>@</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Value:</span> <span>mail.yourdomain.com</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Priority:</span> <span>10</span></div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                DNS changes may take up to 24 hours to propagate globally, though typically they take less than an hour.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
