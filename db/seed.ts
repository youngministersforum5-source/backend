import "dotenv/config";
import { Pool } from "pg";
import { z } from "zod";
import { hashPassword, generateSecurePassword } from "../src/utils/password";
import { sendInitialAdminPassword } from "../src/services/email.service";

const emailSchema = z.string().trim().toLowerCase().email();

/**
 * Idempotent admin seed.
 *
 * For each email in ADMIN_EMAILS:
 *  - If the admin already exists: do nothing. Never regenerate or resend
 *    a password for an existing account.
 *  - If the admin does not exist: create it with a freshly generated,
 *    cryptographically secure password, store only its Argon2id hash, and
 *    email the plaintext password to the administrator exactly once.
 */
async function seed(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  const raw = process.env.ADMIN_EMAILS;

  if (!raw || raw.trim().length === 0) {
    console.error("❌ ADMIN_EMAILS is not set. Nothing to seed.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });

  const emails = raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  try {
    for (const rawEmail of emails) {
      const parsed = emailSchema.safeParse(rawEmail);

      if (!parsed.success) {
        console.warn(`⚠️  Skipping invalid admin email: "${rawEmail}"`);
        continue;
      }

      const email = parsed.data;

      const existing = await pool.query("SELECT id FROM admins WHERE email = $1", [email]);

      if (existing.rows.length > 0) {
        console.log(`✔ Admin already exists, skipping: ${email}`);
        continue;
      }

      const temporaryPassword = generateSecurePassword(24);
      const passwordHash = await hashPassword(temporaryPassword);

      await pool.query(
        "INSERT INTO admins (email, password_hash, is_active) VALUES ($1, $2, TRUE)",
        [email, passwordHash]
      );

      console.log(`✔ Created new admin: ${email}`);

      try {
        await sendInitialAdminPassword(email, temporaryPassword);
        console.log(`✔ Sent initial password email to: ${email}`);
      } catch (err) {
        // The admin account exists even if the email failed to send. Do NOT
        // print the password to the console/logs in production; surface a
        // clear operator warning instead so they can resolve delivery and
        // use a manual password reset flow if one exists.
        console.error(
          `⚠️  Admin account created for ${email}, but the initial password email failed to send.`,
          err instanceof Error ? err.message : err
        );
      }
    }
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exitCode = 1;
});
