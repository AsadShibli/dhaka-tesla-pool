import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Runs before the API starts: every SQL file in migrations/ once, in name order, then the demo cast once.
// Applied files are recorded in schema_migrations, so a restart skips them.
const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "migrations");
const seedFile = join(here, "seed", "cast.sql");
// Any constant works. It stops two API containers from migrating at the same time.
const LOCK_ID = 4141;

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
    const steps = [...files.map((name) => ({ name, path: join(migrationsDir, name) })),
      { name: "seed/cast.sql", path: seedFile }];
    if (process.env.SKIP_SEED === "true") steps.pop();

    await adoptExisting(client, steps);
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((row) => row.name));

    for (const step of steps) {
      if (done.has(step.name)) continue;
      const text = await readFile(step.path, "utf8");
      // One transaction per file: a failed file leaves no half-made tables behind.
      await client.query("BEGIN");
      try {
        await client.query(text);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [step.name]);
        await client.query("COMMIT");
        console.log(`migrate: applied ${step.name}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`migrate: ${step.name} failed: ${err.message}`);
      }
    }
    console.log("migrate: database is up to date");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

// A database set up by hand (the old README steps) has the tables but no record of them.
// Mark what is already there as applied instead of failing on CREATE TABLE.
async function adoptExisting(client, steps) {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM schema_migrations");
  if (rows[0].n > 0) return;
  const { rows: found } = await client.query("SELECT to_regclass('public.payments') IS NOT NULL AS ready");
  if (!found[0].ready) return;
  // The hand-run steps covered 0001 to 0010 and the seed. Anything newer still runs.
  const manual = steps.filter((step) => step.name <= "0010_payments.sql" || step.name === "seed/cast.sql");
  for (const step of manual) {
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [step.name]);
  }
  console.log("migrate: existing tables found, recorded them as applied");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
