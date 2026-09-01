import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

/**
 * Direct-to-Postgres access layer (no ORM).
 *
 */
declare global {
  // eslint-disable-next-line no-var
  var __ymfPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    // Keep the pool modest and avoid unnecessary long-lived connections —
    // Neon's pooled endpoint is designed for many short-lived borrows.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const pool: Pool = global.__ymfPool ?? createPool();

if (env.NODE_ENV !== "production") {
  global.__ymfPool = pool;
}

pool.on("error", (err) => {
  // Errors on idle clients in the pool (e.g. connection dropped by Neon)
  // must be handled here or they crash the process.
  logger.error({ err }, "Unexpected error on idle pg client");
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Runs `fn` inside a BEGIN/COMMIT transaction on a single dedicated client,
 * rolling back automatically if `fn` throws.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function connectDatabase(): Promise<void> {
  // Verify connectivity eagerly at startup rather than waiting for the
  // first request to discover a bad connection string.
  const client = await pool.connect();
  client.release();
}

export async function disconnectDatabase(): Promise<void> {
  await pool.end();
}
