import { useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Crown, LogOut, Mail, User, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserTier } from "@/hooks/use-user-tier";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const { profile, tier, premiumExpiresAt, isAdmin, loading } = useUserTier();

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <User className="w-12 h-12 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold text-foreground">You're not signed in</p>
          <p className="text-sm text-muted-foreground mt-1">Sign in to view your profile</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setLocation("/sign-in")}>
          Sign in
        </Button>
      </div>
    );
  }

  const initial = (user.firstName?.[0] || user.username?.[0] || user.emailAddresses[0]?.emailAddress?.[0] || "U").toUpperCase();
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user.username || "User";
  const email = user.primaryEmailAddress?.emailAddress ?? profile?.email ?? "";
  const joinedAt = profile?.createdAt ? new Date(profile.createdAt) : null;

  const expiryInfo = (): { label: string; urgent: boolean } | null => {
    if (!premiumExpiresAt) return null;
    const d = new Date(premiumExpiresAt);
    const now = new Date();
    if (d < now) return { label: "Expired", urgent: true };
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return { label: "Expires tomorrow", urgent: true };
    if (days <= 3) return { label: `Expires in ${days} days`, urgent: true };
    return { label: `Expires in ${days} days`, urgent: false };
  };

  const expiry = expiryInfo();

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      {/* Tier card */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${
        tier === "premium"
          ? "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20"
          : "border-border bg-card"
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          tier === "premium"
            ? "bg-violet-100 dark:bg-violet-800/60"
            : "bg-muted"
        }`}>
          {tier === "premium"
            ? <Crown className="w-5 h-5 text-violet-600 dark:text-violet-300" />
            : <User className="w-5 h-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">
            {tier === "premium" ? "Premium Account" : "Free Account"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tier === "premium"
              ? "Full inbox access — all emails visible"
              : "Limited to Facebook security code emails"}
          </p>
          {expiry && (
            <p className={`text-xs font-semibold mt-1 ${expiry.urgent ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {expiry.label}
            </p>
          )}
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
          tier === "premium"
            ? "bg-violet-600 text-white"
            : "bg-muted text-muted-foreground"
        }`}>
          {tier === "premium" ? "⭐ Premium" : "Free"}
        </span>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">Email address</p>
            <p className="text-sm font-semibold text-foreground truncate">{email}</p>
          </div>
        </div>

        {(user.username || profile?.username) && (
          <div className="flex items-center gap-3 px-4 py-3">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Username</p>
              <p className="text-sm font-semibold text-foreground">{user.username || profile?.username}</p>
            </div>
          </div>
        )}

        {joinedAt && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Member since</p>
              <p className="text-sm font-semibold text-foreground">
                {joinedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Shield className="w-4 h-4 text-violet-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Role</p>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">Administrator</p>
            </div>
          </div>
        )}
      </div>

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full h-10 text-sm text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => signOut({ redirectUrl: `${basePath}/` })}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}
