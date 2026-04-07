import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  res.json({
    users: users.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      email: u.email,
      username: u.username,
      tier: u.tier,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    })),
  });
});

router.patch("/admin/users/:id/tier", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { tier } = req.body as { tier: string };

  if (!["free", "premium"].includes(tier)) {
    res.status(400).json({ error: "tier must be 'free' or 'premium'" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ tier })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: updated.id, tier: updated.tier });
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
