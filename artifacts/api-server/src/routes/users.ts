import { Router, type IRouter } from "express";
import { eq, count, or } from "drizzle-orm";
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

// Sync does NOT require server-side Clerk auth — clerkId comes from the body.
// The frontend only calls this when Clerk reports isSignedIn=true, so we trust the payload.
router.post("/users/me/sync", async (req, res): Promise<void> => {
  const { clerkId, email, username } = req.body as {
    clerkId?: string;
    email?: string;
    username?: string;
  };

  if (!clerkId) {
    res.status(400).json({ error: "clerkId is required" });
    return;
  }

  // Match by clerkId first; fall back to email (catches manually-added users)
  const conditions = [eq(usersTable.clerkId, clerkId)];
  if (email) conditions.push(eq(usersTable.email, email));
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(or(...conditions));

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({
        clerkId,
        email: email ?? existing.email,
        username: username ?? existing.username,
      })
      .where(eq(usersTable.id, existing.id))
      .returning();

    // Auto-expire premium
    const now = new Date();
    let result = updated;
    if (updated.tier === "premium" && updated.premiumExpiresAt && updated.premiumExpiresAt < now) {
      const [downgraded] = await db
        .update(usersTable)
        .set({ tier: "free", premiumExpiresAt: null })
        .where(eq(usersTable.clerkId, clerkId))
        .returning();
      result = downgraded;
    }

    res.json({
      id: result.id,
      clerkId: result.clerkId,
      email: result.email,
      username: result.username,
      tier: result.tier,
      isAdmin: result.isAdmin,
      premiumExpiresAt: result.premiumExpiresAt,
    });
  } else {
    // Check if this is the very first user — auto-promote to admin + premium
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
    res.json({
      id: created.id,
      clerkId: created.clerkId,
      email: created.email,
      username: created.username,
      tier: created.tier,
      isAdmin: created.isAdmin,
      premiumExpiresAt: created.premiumExpiresAt,
    });
  }
});

export default router;
