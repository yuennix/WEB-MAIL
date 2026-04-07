import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({ clerkId, email: "", tier: "free", isAdmin: false })
      .returning();
  }

  // Auto-expire premium if past expiry date
  const now = new Date();
  if (user.tier === "premium" && user.premiumExpiresAt && user.premiumExpiresAt < now) {
    const [downgraded] = await db
      .update(usersTable)
      .set({ tier: "free", premiumExpiresAt: null })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    user = downgraded;
  }

  res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    username: user.username,
    tier: user.tier,
    isAdmin: user.isAdmin,
    premiumExpiresAt: user.premiumExpiresAt,
  });
});

router.post("/users/me/sync", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId as string;
  const { email, username } = req.body as { email?: string; username?: string };

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({ email: email ?? existing.email, username: username ?? existing.username })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    res.json({ id: updated.id, tier: updated.tier, isAdmin: updated.isAdmin });
  } else {
    // Check if this is the very first user — auto-promote to admin
    const [{ count: userCount }] = await db
      .select({ count: count() })
      .from(usersTable);
    const isFirstUser = Number(userCount) === 0;

    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId,
        email: email ?? "",
        username: username ?? null,
        tier: isFirstUser ? "premium" : "free",
        isAdmin: isFirstUser,
      })
      .returning();
    res.json({ id: created.id, tier: created.tier, isAdmin: created.isAdmin });
  }
});

export default router;
