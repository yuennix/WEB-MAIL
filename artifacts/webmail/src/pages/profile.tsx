import { Crown, Mail, User, Shield, Clock } from "lucide-react";
import { useUserTier } from "@/hooks/use-user-tier";

export function ProfilePage() {
  const { tier, isAdmin, premiumExpiresAt } = useUserTier();

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0">
          G
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">Guest</h1>
          <p className="text-sm text-muted-foreground">No account required</p>
        </div>
      </div>

      <div className={`rounded-xl border p-4 flex items-start gap-4 ${
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
              : "Facebook verification codes only (6 & 8-digit)"}
          </p>
          {tier === "premium" && premiumExpiresAt && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-mono font-bold">
                Expires {new Date(premiumExpiresAt).toLocaleDateString()}
              </span>
            </div>
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

      {isAdmin && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Shield className="w-4 h-4 text-violet-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Role</p>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
