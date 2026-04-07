import { useState, useEffect } from "react";
import { useUserTier } from "@/hooks/use-user-tier";
import { Button } from "@/components/ui/button";
import { Shield, Crown, User, RefreshCw, Users, Star, UserCheck } from "lucide-react";
import { useLocation } from "wouter";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";

interface AdminUser {
  id: number;
  clerkId: string;
  email: string;
  username: string | null;
  tier: string;
  isAdmin: boolean;
  premiumExpiresAt: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  premium: number;
  free: number;
}

const DURATIONS = [
  { label: "1 Day", value: "1d" },
  { label: "7 Days", value: "7d" },
  { label: "1 Month", value: "30d" },
];

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const d = new Date(expiresAt);
  const now = new Date();
  if (d < now) return "Expired";
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

export function AdminPage() {
  const { isAdmin, loading } = useUserTier();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, premium: 0, free: 0 });
  const [fetching, setFetching] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Record<number, string>>({});

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/users`, { credentials: "include" });
      const data = await res.json();
      setUsers(data.users ?? []);
      if (data.stats) setStats(data.stats);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !isAdmin) {
      setLocation("/");
    } else if (!loading && isAdmin) {
      fetchUsers();
    }
  }, [loading, isAdmin]);

  const setTier = async (userId: number, tier: string) => {
    setUpdating(userId);
    const duration = selectedDuration[userId] || "7d";
    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier, duration: tier === "premium" ? duration : undefined }),
      });
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, tier: updated.tier, premiumExpiresAt: updated.premiumExpiresAt ?? null }
            : u
        )
      );
      setStats((prev) => {
        const wasPremium = users.find((u) => u.id === userId)?.tier === "premium";
        const nowPremium = tier === "premium";
        if (wasPremium === nowPremium) return prev;
        return {
          total: prev.total,
          premium: nowPremium ? prev.premium + 1 : prev.premium - 1,
          free: nowPremium ? prev.free - 1 : prev.free + 1,
        };
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={fetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.premium}</p>
            <p className="text-xs text-muted-foreground">Premium</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.free}</p>
            <p className="text-xs text-muted-foreground">Free</p>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-semibold text-muted-foreground">
            {users.length} registered user{users.length !== 1 ? "s" : ""}
          </p>
        </div>

        {users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            {fetching ? "Loading..." : "No users yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 flex-wrap">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                  {u.isAdmin ? (
                    <Shield className="w-4 h-4 text-violet-600" />
                  ) : (
                    <User className="w-4 h-4 text-violet-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-foreground">
                    {u.email || u.username || u.clerkId}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.isAdmin && <span className="ml-2 text-violet-500 font-semibold">• Admin</span>}
                  </p>
                  {u.tier === "premium" && u.premiumExpiresAt && (
                    <p className={`text-[11px] font-medium mt-0.5 ${
                      new Date(u.premiumExpiresAt) < new Date()
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {formatExpiry(u.premiumExpiresAt)}
                    </p>
                  )}
                </div>

                {/* Tier badge */}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  u.tier === "premium"
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {u.tier === "premium" ? "⭐ Premium" : "Free"}
                </span>

                {/* Actions */}
                {u.tier === "free" ? (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Duration selector */}
                    <div className="flex rounded-md border border-input overflow-hidden text-xs">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() =>
                            setSelectedDuration((prev) => ({ ...prev, [u.id]: d.value }))
                          }
                          className={`px-2.5 py-1.5 font-medium transition-colors ${
                            (selectedDuration[u.id] || "7d") === d.value
                              ? "bg-violet-600 text-white"
                              : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="h-8 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                      onClick={() => setTier(u.id, "premium")}
                      disabled={updating === u.id}
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      {updating === u.id ? "Upgrading…" : "Upgrade"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => setTier(u.id, "free")}
                    disabled={updating === u.id}
                  >
                    {updating === u.id ? "Downgrading…" : "Downgrade"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
