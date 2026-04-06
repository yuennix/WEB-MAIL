import { Router, type IRouter } from "express";
import multer from "multer";
import { db, emailsTable, domainsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

interface HanamiEmail {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  headers?: Record<string, string>[];
}

router.post(
  "/webhook/email",
  upload.any(),
  async (req, res): Promise<void> => {
    try {
      const rawEmail = req.body?.email;
      if (!rawEmail) {
        req.log.warn("Webhook received with no email field");
        res.status(400).json({ error: "Missing email field" });
        return;
      }

      let emailData: HanamiEmail;
      try {
        emailData = JSON.parse(rawEmail);
      } catch {
        req.log.warn("Failed to parse email JSON");
        res.status(400).json({ error: "Invalid email JSON" });
        return;
      }

      const fromAddress = emailData.from ?? "unknown@unknown.com";
      const toAddress = (emailData.to ?? "").toLowerCase().trim();
      const subject = emailData.subject ?? "(no subject)";
      const body = emailData.body ?? "";

      if (!toAddress) {
        req.log.warn("Webhook received with empty to address");
        res.status(400).json({ error: "Missing to address" });
        return;
      }

      const toHost = toAddress.split("@")[1];
      if (toHost) {
        const knownDomains = await db
          .select()
          .from(domainsTable)
          .where(eq(domainsTable.name, toHost));

        if (knownDomains.length === 0) {
          await db.insert(domainsTable).values({ name: toHost, active: true });
          req.log.info({ domain: toHost }, "Auto-registered domain from webhook");
        }
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(body);
      const htmlBody = isHtml ? body : null;
      const textBody = isHtml ? null : body;

      const preview = body
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      const messageId = `webhook-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const [inserted] = await db
        .insert(emailsTable)
        .values({
          messageId,
          toAddress,
          fromAddress,
          subject,
          htmlBody,
          textBody,
          preview,
          read: false,
          receivedAt: new Date(),
          sizeBytes: Buffer.byteLength(rawEmail, "utf8"),
        })
        .returning();

      req.log.info(
        { emailId: inserted.id, to: toAddress, from: fromAddress, subject },
        "Email received and stored"
      );

      res.status(200).json({ status: "ok", emailId: inserted.id });
    } catch (err) {
      req.log.error({ err }, "Failed to process incoming webhook");
      res.status(500).json({ error: "Internal error" });
    }
  }
);

export default router;
