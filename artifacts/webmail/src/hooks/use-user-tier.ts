import { useEffect, useState } from "react";
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
}

export function useUserTier() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    const username = user?.username ?? user?.firstName ?? null;

    fetch(`${apiBase}/api/users/me/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, username }),
    })
      .then((r) => r.json())
      .then(() => fetch(`${apiBase}/api/users/me`, { credentials: "include" }))
      .then((r) => r.json())
      .then((data) => {
        setProfile(data as UserProfile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, isSignedIn, user]);

  return { profile, loading, tier: profile?.tier ?? "free", isAdmin: profile?.isAdmin ?? false };
}
