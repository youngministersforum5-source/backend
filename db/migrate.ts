import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

/**
 * Minimal, dependency-free migration runner.
 *
 * Applies every `.sql` file in `db/migrations/`, in filename order, exactly
 * once. Applied filenames are tracked in a `_migrations` table so re-running
 * this script is always safe (already-applied files are skipped).
 *
 * Uses DIRECT_URL when available (recommended for DDL against Neon, outside
 * PgBouncer's transaction-pooling mode), falling back to DATABASE_URL.
 */
async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ Set DATABASE_URL (and ideally DIRECT_URL) before running migrations.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const { rows: appliedRows } = await client.query<{ filename: string }>(
      "SELECT filename FROM _migrations"
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    let ranAny = false;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`✔ Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

      console.log(`→ Applying: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`✔ Applied: ${file}`);
        ranAny = true;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    if (!ranAny) {
      console.log("✔ Database is already up to date. No migrations to apply.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exitCode = 1;
});
