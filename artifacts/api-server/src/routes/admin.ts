import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any, next: any) {
  const clerkId = req.clerkUserId as string;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

function durationToDate(duration: string): Date | null {
  const now = new Date();
  if (duration === "1d") {
    now.setDate(now.getDate() + 1);
    return now;
  }
  if (duration === "7d") {
    now.setDate(now.getDate() + 7);
    return now;
  }
  if (duration === "30d") {
    now.setDate(now.getDate() + 30);
    return now;
  }
  return null;
}

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  const now = new Date();
  const mapped = users.map((u) => {
    const expired = u.premiumExpiresAt && u.premiumExpiresAt < now;
    const effectiveTier = (u.tier === "premium" && expired) ? "free" : u.tier;
    return {
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      username: u.username,
      tier: effectiveTier,
      isAdmin: u.isAdmin,
      premiumExpiresAt: u.premiumExpiresAt,
      createdAt: u.createdAt,
    };
  });

  const total = mapped.length;
  const premium = mapped.filter((u) => u.tier === "premium").length;
  const free = mapped.filter((u) => u.tier === "free").length;

  res.json({ users: mapped, stats: { total, premium, free } });
});

router.patch("/admin/users/:id/tier", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { tier, duration } = req.body as { tier: string; duration?: string };

  if (!["free", "premium"].includes(tier)) {
    res.status(400).json({ error: "tier must be 'free' or 'premium'" });
    return;
  }

  let premiumExpiresAt: Date | null = null;
  if (tier === "premium" && duration) {
    premiumExpiresAt = durationToDate(duration);
  }

  const [updated] = await db
    .update(usersTable)
    .set({ tier, premiumExpiresAt: tier === "free" ? null : premiumExpiresAt })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: updated.id, tier: updated.tier, premiumExpiresAt: updated.premiumExpiresAt });
});

router.patch("/admin/users/:id/admin", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { isAdmin } = req.body as { isAdmin: boolean };

  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: updated.id, isAdmin: updated.isAdmin });
});

export default router;
