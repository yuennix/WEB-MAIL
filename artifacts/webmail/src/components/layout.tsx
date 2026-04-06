import React from "react";
import { Link, useLocation } from "wouter";
import { Inbox, Settings, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-tight text-foreground text-lg">WebMail</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/">
              <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="gap-2">
                <Inbox className="w-4 h-4" />
                <span>Inbox</span>
              </Button>
            </Link>
            <Link href="/domains">
              <Button variant={location === "/domains" ? "secondary" : "ghost"} size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                <span>Domains</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
