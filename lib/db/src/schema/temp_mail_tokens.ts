import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tempMailTokensTable = pgTable("temp_mail_tokens", {
  email: text("email").primaryKey(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TempMailToken = typeof tempMailTokensTable.$inferSelect;
