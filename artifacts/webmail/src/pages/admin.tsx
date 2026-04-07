import { useState, useEffect } from "react";
import { useUserTier } from "@/hooks/use-user-tier";
import { Button } from "@/components/ui/button";
import { Shield, Crown, User, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";

interface AdminUser {
  id: number;
  clerkId: string;
  email: string;
  username: string | null;
  tier: string;
  isAdmin: boolean;
  createdAt: string;
}

export function AdminPage() {
  const { isAdmin, loading } = useUserTier();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/users`, { credentials: "include" });
      const data = await res.json();
      setUsers(data.users ?? []);
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
    try {
      await fetch(`${apiBase}/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier } : u)));
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

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-sm font-semibold text-muted-foreground">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>
        {users.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            {fetching ? "Loading..." : "No users yet."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                  {u.isAdmin ? (
                    <Shield className="w-4 h-4 text-violet-600" />
                  ) : (
                    <User className="w-4 h-4 text-violet-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {u.username || u.email || u.clerkId}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.isAdmin && <span className="ml-2 text-violet-500 font-semibold">• Admin</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    u.tier === "premium"
                      ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {u.tier === "premium" ? "⭐ Premium" : "Free"}
                  </span>
                  {u.tier === "free" ? (
                    <Button
                      size="sm"
                      className="h-8 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                      onClick={() => setTier(u.id, "premium")}
                      disabled={updating === u.id}
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Upgrade
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setTier(u.id, "free")}
                      disabled={updating === u.id}
                    >
                      Downgrade
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
