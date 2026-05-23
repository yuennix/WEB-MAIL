export type Tier = "free" | "premium";

export interface UserProfile {
  id: number;
  clerkId: string;
  email: string;
  username: string | null;
  tier: Tier;
  isAdmin: boolean;
  premiumExpiresAt: string | null;
  allowedDomainIds: number[];
}

export function useUserTier() {
  return {
    profile: null as UserProfile | null,
    loading: false,
    tier: "free" as Tier,
    isAdmin: false,
    premiumExpiresAt: null as string | null,
    allowedDomainIds: [] as number[],
    refresh: () => {},
  };
}
