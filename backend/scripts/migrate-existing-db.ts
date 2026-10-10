/**
 * One-time upgrade for a database that already has tables but no Prisma
 * migration history (prisma migrate deploy fails there with P3005).
 *
 * Runs every prisma/migrations/<name>/migration.sql against DIRECT_URL — they are
 * idempotent, so existing tables/data are kept and only missing pieces are added —
 * then marks each one as applied. Afterwards use `bun run db:migrate` as usual.
 *
 * Usage (from backend/):
 *   bun run db:migrate:existing
 */

import "../src/config/env.config.js";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is not set (check your .env.<NODE_ENV> file)");
  process.exit(1);
}

const dir = join(import.meta.dir, "../prisma/migrations");
const migrations = readdirSync(dir)
  .filter((name) => existsSync(join(dir, name, "migration.sql")))
  .sort();

const prisma = (...args: string[]) =>
  Bun.spawnSync(["bunx", "prisma", ...args], { stdout: "pipe", stderr: "pipe" });

for (const name of migrations) {
  const run = prisma("db", "execute", "--url", url, "--file", join(dir, name, "migration.sql"));
  if (run.exitCode !== 0) {
    console.error(`❌ ${name}\n${run.stderr.toString()}`);
    process.exit(1);
  }

  const resolve = prisma("migrate", "resolve", "--applied", name);
  const output = resolve.stdout.toString() + resolve.stderr.toString();
  if (resolve.exitCode !== 0 && !output.includes("P3008")) {
    console.error(`❌ ${name} (mark as applied)\n${output}`);
    process.exit(1);
  }
  console.log(`✅ ${name}`);
}

console.log(`\nDone — ${migrations.length} migrations applied and recorded.`);
