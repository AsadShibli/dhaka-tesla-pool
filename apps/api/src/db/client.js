import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// One pool per process. On Vercel each function instance keeps only a few connections,
// since many instances can run at once against the same database.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.VERCEL ? 3 : 10,
});

export const db = drizzle(pool);
