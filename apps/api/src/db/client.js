import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// One pool for the API. The URL comes from the environment.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);
