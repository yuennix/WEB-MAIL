import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Inbox, Settings, Mail, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Inbox", icon: Inbox },
    { href: "/domains", label: "Domains", icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-tight text-foreground text-lg">WebMail</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-border px-2 py-3 space-y-1 bg-background">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} onClick={() => setMobileMenuOpen(false)}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 h-[100dvh] shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-md flex items-center justify-center text-white shadow-sm border border-white/5">
              <Mail className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-wide text-sidebar-foreground text-base">WebMail</span>
          </div>
        </div>
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">Menu</div>
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group ${active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}>
                <item.icon className={`w-4 h-4 ${active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-sidebar-border/50 text-xs text-sidebar-foreground/40 font-mono">
          v1.0.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 bg-background">
        {children}
      </main>
    </div>
  );
}
