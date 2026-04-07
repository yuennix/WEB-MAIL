import { Router, type IRouter } from "express";
import { eq, count, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function buildProfile(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    username: user.username,
    tier: user.tier,
    isAdmin: user.isAdmin,
    premiumExpiresAt: user.premiumExpiresAt,
  };
}

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

  res.json(buildProfile(user));
});

// Sync does NOT require server-side Clerk auth — clerkId comes from the body.
// The frontend only calls this when Clerk reports isSignedIn=true, so we trust the payload.
router.post("/users/me/sync", async (req, res): Promise<void> => {
  const { clerkId, email, username, sessionToken: clientToken } = req.body as {
    clerkId?: string;
    email?: string;
    username?: string;
    sessionToken?: string;
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

  let result: typeof usersTable.$inferSelect;

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
    let current = updated;
    const now = new Date();
    if (current.tier === "premium" && current.premiumExpiresAt && current.premiumExpiresAt < now) {
      const [downgraded] = await db
        .update(usersTable)
        .set({ tier: "free", premiumExpiresAt: null })
        .where(eq(usersTable.clerkId, clerkId))
        .returning();
      current = downgraded;
    }

    // ── Single-device session enforcement ──────────────────────────────
    // Admins are exempt so they can manage from any device.
    if (!current.isAdmin) {
      const dbToken = current.sessionToken;

      if (!clientToken) {
        // New device / fresh login — generate a token, invalidate previous device
        const newToken = crypto.randomUUID();
        const [saved] = await db
          .update(usersTable)
          .set({ sessionToken: newToken })
          .where(eq(usersTable.clerkId, clerkId))
          .returning();
        result = saved;
        return res.json({ ...buildProfile(result), sessionToken: newToken, kicked: false });
      }

      if (clientToken === dbToken) {
        // Same device — all good
        result = current;
        return res.json({ ...buildProfile(result), sessionToken: dbToken, kicked: false });
      }

      // Different token — this is a stale device; kick it
      return res.json({ ...buildProfile(current), sessionToken: null, kicked: true });
    }
    // ──────────────────────────────────────────────────────────────────

    result = current;
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
    result = created;
  }

  // Generate session token for new or admin users
  if (!result.sessionToken && !result.isAdmin) {
    const newToken = crypto.randomUUID();
    const [saved] = await db
      .update(usersTable)
      .set({ sessionToken: newToken })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    result = saved;
    return res.json({ ...buildProfile(result), sessionToken: newToken, kicked: false });
  }

  res.json({ ...buildProfile(result), sessionToken: result.sessionToken ?? null, kicked: false });
});

export default router;
