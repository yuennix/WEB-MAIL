import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/react";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || "";

export type Tier = "free" | "premium";

export interface UserProfile {
  id: number;
  clerkId: string;
  email: string;
  username: string | null;
  tier: Tier;
  isAdmin: boolean;
  premiumExpiresAt: string | null;
}

export function useUserTier() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) return;
    const clerkId = user.id ?? "";
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const username = user.username ?? user.firstName ?? null;
    try {
      const r = await fetch(`${apiBase}/api/users/me/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId, email, username }),
      });
      const data = await r.json();
      setProfile(data as UserProfile);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProfile(null);
      setLoading(false);
      return;
    }
    sync();
  }, [isLoaded, isSignedIn, sync]);

  return {
    profile,
    loading,
    tier: profile?.tier ?? "free",
    isAdmin: profile?.isAdmin ?? false,
    premiumExpiresAt: profile?.premiumExpiresAt ?? null,
    refresh: sync,
  };
}
