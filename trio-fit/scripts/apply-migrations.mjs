// Prints the migration files in order so they can be pasted into the Supabase SQL editor,
// or pipe into psql:  node scripts/apply-migrations.mjs | psql "$DATABASE_URL"
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = new URL('../supabase/migrations/', import.meta.url).pathname;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  process.stdout.write(`-- ${f}\n${readFileSync(join(dir, f), 'utf8')}\n`);
}
