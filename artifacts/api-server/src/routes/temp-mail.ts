import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, emailsTable, tempMailTokensTable } from "@workspace/db";

const router: IRouter = Router();
const TEMP_MAIL_BASE = "https://api.internal.temp-mail.io/api/v3";

// Register an address on temp-mail.io and persist the token
router.post("/temp-mail/register", async (req, res): Promise<void> => {
  const { address } = req.body as { address?: string };
  if (!address || !address.includes("@")) {
    res.status(400).json({ ok: false, error: "address required" });
    return;
  }

  const addr = address.toLowerCase().trim();
  const atIdx = addr.indexOf("@");
  const name = addr.slice(0, atIdx);
  const domain = addr.slice(atIdx + 1);

  // Return cached token if we already have one
  const [cached] = await db
    .select()
    .from(tempMailTokensTable)
    .where(eq(tempMailTokensTable.email, addr));

  if (cached?.token) {
    res.json({ ok: true, token: cached.token, cached: true });
    return;
  }

  // Register with temp-mail.io
  try {
    const response = await fetch(`${TEMP_MAIL_BASE}/email/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domain }),
    });

    if (!response.ok) {
      res.json({ ok: false, error: "Not a temp-mail.io domain" });
      return;
    }

    const data = await response.json() as { email?: string; token?: string };
    const token = data.token ?? "";

    if (!token) {
      // Address already existed but token not returned — can't recover
      res.json({ ok: false, error: "Address already exists on temp-mail.io but token was not returned" });
      return;
    }

    // Persist token — explicit check to avoid conflict syntax issues
    const [existingRow] = await db.select().from(tempMailTokensTable).where(eq(tempMailTokensTable.email, addr));
    if (existingRow) {
      await db.update(tempMailTokensTable).set({ token }).where(eq(tempMailTokensTable.email, addr));
    } else {
      await db.insert(tempMailTokensTable).values({ email: addr, token });
    }

    res.json({ ok: true, token, cached: false });
  } catch (err: any) {
    res.json({ ok: false, error: err.message ?? "Unknown error" });
  }
});

// Fetch messages from temp-mail.io and save new ones to the emails table
router.post("/temp-mail/sync", async (req, res): Promise<void> => {
  const { address } = req.body as { address?: string };
  if (!address || !address.includes("@")) {
    res.status(400).json({ ok: false, error: "address required" });
    return;
  }

  const addr = address.toLowerCase().trim();

  const [stored] = await db
    .select()
    .from(tempMailTokensTable)
    .where(eq(tempMailTokensTable.email, addr));

  if (!stored?.token) {
    res.json({ ok: false, error: "No token found — register first" });
    return;
  }

  try {
    const response = await fetch(
      `${TEMP_MAIL_BASE}/email/${encodeURIComponent(addr)}/messages`,
      { headers: { "Authorization": `Bearer ${stored.token}` } }
    );

    if (!response.ok) {
      res.json({ ok: false, error: "Failed to fetch from temp-mail.io" });
      return;
    }

    const messages = await response.json() as Array<{
      id: string;
      from: string;
      subject: string;
      body_html?: string;
      body_text?: string;
      created_at: string;
    }>;

    let added = 0;
    for (const msg of messages) {
      const msgId = `tmpmail_${msg.id}`;

      const [existing] = await db
        .select({ id: emailsTable.id })
        .from(emailsTable)
        .where(eq(emailsTable.messageId, msgId));

      if (existing) continue;

      const preview = (msg.body_text ?? "").slice(0, 200).trim();
      await db.insert(emailsTable).values({
        messageId: msgId,
        toAddress: addr,
        fromAddress: msg.from,
        subject: msg.subject || "(no subject)",
        htmlBody: msg.body_html ?? null,
        textBody: msg.body_text ?? null,
        preview,
        receivedAt: new Date(msg.created_at),
        sizeBytes: 0,
      });
      added++;
    }

    res.json({ ok: true, added, total: messages.length });
  } catch (err: any) {
    res.json({ ok: false, error: err.message ?? "Unknown error" });
  }
});

export default router;
