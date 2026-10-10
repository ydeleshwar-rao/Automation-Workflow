/**
 * Reads table definitions from an existing database (e.g. your Supabase project)
 * and writes one migration per table that prisma/migrations does not create yet:
 *
 *   <next>_create_enum_types           enum types used by those tables
 *   <next>_create_<table>              columns, defaults, PK/unique/check/FK, indexes
 *   <next>_alter_<table>_add_columns   columns that exist in the source but not in our migration
 *   <next>_create_functions            public SQL functions (except Supabase-auth ones)
 *   <next>_create_triggers             triggers on public tables
 *
 * Read-only on the source database. Everything generated is idempotent.
 *
 * Usage (from backend/):
 *   bun scripts/generate-migrations-from-db.ts "<source connection string>"
 *   bun scripts/generate-migrations-from-db.ts            # uses SUPABASE_DB_URL from .env.<NODE_ENV>
 */

import "../src/config/env.config.js";
import pg from "pg";
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const sourceUrl = process.argv[2] ?? process.env.SUPABASE_DB_URL;
if (!sourceUrl) {
  console.error("Pass the source connection string as an argument or set SUPABASE_DB_URL");
  process.exit(1);
}

const migrationsDir = join(import.meta.dir, "../prisma/migrations");
const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

// ── What do existing migrations already create? ────────────────────────────
const existing = readdirSync(migrationsDir).filter((d) => existsSync(join(migrationsDir, d, "migration.sql"))).sort();
const existingSql = existing.map((d) => readFileSync(join(migrationsDir, d, "migration.sql"), "utf8")).join("\n");
const createdTables = new Map<string, string>(); // table -> its CREATE TABLE statement
for (const m of existingSql.matchAll(/CREATE TABLE IF NOT EXISTS "([^"]+)" \(([\s\S]*?)\n\);/g)) {
  createdTables.set(m[1]!, m[2]!);
}
const lastPrefix = Number(existing.at(-1)?.split("_")[0] ?? "20261010000000");
let next = lastPrefix + 1;
const written: string[] = [];

function writeMigration(name: string, sql: string) {
  const folder = `${next++}_${name}`;
  mkdirSync(join(migrationsDir, folder), { recursive: true });
  writeFileSync(join(migrationsDir, folder, "migration.sql"), sql.trimEnd() + "\n");
  written.push(folder);
}

/** Supabase keeps extension functions in the "extensions" schema; plain Postgres has gen_random_uuid() built in. */
const portable = (expr: string) =>
  expr
    .replace(/(extensions\.)?uuid_generate_v4\(\)/g, "gen_random_uuid()")
    .replace(/extensions\./g, "");

// ── Read the source schema ─────────────────────────────────────────────────
const client = new pg.Client({ connectionString: sourceUrl });
await client.connect();
await client.query("SET search_path TO public");

const tables = (await client.query(`
  SELECT c.oid, c.relname AS name
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('_prisma_migrations')
  ORDER BY c.relname`)).rows as { oid: number; name: string }[];

const columns = (await client.query(`
  SELECT c.relname AS table, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
         a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS default_expr,
         a.attidentity AS identity, a.attgenerated AS generated, t.typtype AS typtype, t.typname AS typname,
         et.typtype AS elem_typtype, et.typname AS elem_typname
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_type t ON t.oid = a.atttypid
  LEFT JOIN pg_type et ON et.oid = t.typelem AND t.typcategory = 'A'
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped
  ORDER BY c.relname, a.attnum`)).rows;

const constraints = (await client.query(`
  SELECT c.relname AS table, con.conname AS name, con.contype AS type,
         pg_get_constraintdef(con.oid) AS def, fc.relname AS foreign_table
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  LEFT JOIN pg_class fc ON fc.oid = con.confrelid
  WHERE c.relnamespace = 'public'::regnamespace AND con.contype IN ('p', 'u', 'c', 'f')
  ORDER BY c.relname, con.contype, con.conname`)).rows;

const indexes = (await client.query(`
  SELECT t.relname AS table, pg_get_indexdef(i.indexrelid) AS def
  FROM pg_index i
  JOIN pg_class t ON t.oid = i.indrelid
  WHERE t.relnamespace = 'public'::regnamespace
    AND NOT EXISTS (SELECT 1 FROM pg_constraint con WHERE con.conindid = i.indexrelid)
  ORDER BY t.relname`)).rows;

const enums = (await client.query(`
  SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typnamespace = 'public'::regnamespace
  GROUP BY t.typname`)).rows as { name: string; labels: string[] }[];

const functions = (await client.query(`
  SELECT p.proname AS name, pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
    AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  ORDER BY p.proname`)).rows as { name: string; def: string }[];

const triggers = (await client.query(`
  SELECT c.relname AS table, tg.tgname AS name, pg_get_triggerdef(tg.oid) AS def, p.proname AS function
  FROM pg_trigger tg
  JOIN pg_class c ON c.oid = tg.tgrelid
  JOIN pg_proc p ON p.oid = tg.tgfoid
  WHERE c.relnamespace = 'public'::regnamespace AND NOT tg.tgisinternal
  ORDER BY c.relname, tg.tgname`)).rows as { table: string; name: string; def: string; function: string }[];

await client.end();

// ── Tables to create, in foreign-key order ─────────────────────────────────
const newTables = tables.map((t) => t.name).filter((t) => !createdTables.has(t));
const dependsOn = new Map(newTables.map((t) => [t, new Set(
  constraints.filter((c) => c.table === t && c.type === "f" && c.foreign_table !== t && newTables.includes(c.foreign_table))
    .map((c) => c.foreign_table as string),
)]));

const ordered: string[] = [];
const deferredFks: string[] = [];
const visiting = new Set<string>();
function visit(table: string) {
  if (ordered.includes(table) || visiting.has(table)) return;
  visiting.add(table);
  for (const dep of dependsOn.get(table) ?? []) visit(dep);
  visiting.delete(table);
  ordered.push(table);
}
newTables.forEach(visit);

// ── Enum types ─────────────────────────────────────────────────────────────
const usedEnums = new Set(columns
  .filter((c) => newTables.includes(c.table) && (c.typtype === "e" || c.elem_typtype === "e"))
  .map((c) => (c.typtype === "e" ? c.typname : c.elem_typname)));
const enumSql = enums.filter((e) => usedEnums.has(e.name)).map((e) =>
  `DO $$ BEGIN CREATE TYPE ${q(e.name)} AS ENUM (${e.labels.map((l) => `'${l.replace(/'/g, "''")}'`).join(", ")}); ` +
  `EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
if (enumSql.length) writeMigration("create_enum_types", `-- Enum types used by the tables created in the following migrations\n\n${enumSql.join("\n")}`);

// ── One migration per new table ────────────────────────────────────────────
const columnSql = (c: any) => {
  let sql = `  ${q(c.name)} ${c.type}`;
  if (c.generated === "s") return `${sql} GENERATED ALWAYS AS ${portable(c.default_expr).replace(/^\(?/, "(").replace(/\)?$/, ")")} STORED`;
  if (c.identity) sql += ` GENERATED ${c.identity === "a" ? "ALWAYS" : "BY DEFAULT"} AS IDENTITY`;
  else if (c.default_expr) sql += ` DEFAULT ${portable(c.default_expr)}`;
  if (c.not_null) sql += " NOT NULL";
  return sql;
};

for (const table of ordered) {
  const created = new Set(ordered.slice(0, ordered.indexOf(table)));
  const cols = columns.filter((c) => c.table === table);
  const sequences = cols
    .map((c) => String(c.default_expr ?? "").match(/nextval\('([^']+)'::regclass\)/)?.[1])
    .filter(Boolean) as string[];

  const body = cols.map(columnSql);
  for (const con of constraints.filter((c) => c.table === table)) {
    const isLaterFk = con.type === "f" && con.foreign_table !== table && newTables.includes(con.foreign_table) && !created.has(con.foreign_table);
    if (isLaterFk) {
      deferredFks.push(`DO $$ BEGIN\n  ALTER TABLE ${q(table)} ADD CONSTRAINT ${q(con.name)} ${con.def};\nEXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
      continue;
    }
    body.push(`  CONSTRAINT ${q(con.name)} ${portable(con.def)}`);
  }

  const idx = indexes.filter((i) => i.table === table).map((i) =>
    `${portable(i.def).replace(/^CREATE (UNIQUE )?INDEX /, "CREATE $1INDEX IF NOT EXISTS ").replace(/ ON public\./, " ON ")};`);

  writeMigration(`create_${table}`, [
    `-- Table: ${table} (generated from the source database schema)`,
    "",
    ...sequences.map((s) => `CREATE SEQUENCE IF NOT EXISTS ${s.split(".").map((p) => p.replace(/"/g, "")).map(q).join(".")};`),
    ...(sequences.length ? [""] : []),
    `CREATE TABLE IF NOT EXISTS ${q(table)} (`,
    body.join(",\n"),
    ");",
    ...sequences.map((s) => `ALTER SEQUENCE ${s.split(".").map((p) => p.replace(/"/g, "")).map(q).join(".")} OWNED BY ${q(table)}.${q(cols.find((c) => String(c.default_expr).includes(s))!.name)};`),
    ...(idx.length ? ["", ...idx] : []),
  ].join("\n"));
}

if (deferredFks.length) {
  writeMigration("add_circular_foreign_keys", `-- Foreign keys between tables that reference each other\n\n${deferredFks.join("\n\n")}`);
}

// ── Columns missing from tables our migrations already create ──────────────
for (const [table, createSql] of createdTables) {
  if (!tables.some((t) => t.name === table)) continue;
  const missing = columns.filter((c) => c.table === table && !createSql.includes(`"${c.name}"`));
  if (!missing.length) continue;
  writeMigration(`alter_${table}_add_columns`, [
    `-- Table: ${table} — columns found in the source database but not in its create migration`,
    "",
    ...missing.map((c) => `ALTER TABLE ${q(table)} ADD COLUMN IF NOT EXISTS ${columnSql(c).trim()};`),
  ].join("\n"));
}

// ── Functions & triggers ───────────────────────────────────────────────────
const fnSql = functions
  .filter((f) => !/\bauth\./.test(f.def) && !existingSql.includes(`FUNCTION ${f.name}(`))
  .map((f) => `${portable(f.def).trim()};`);
if (fnSql.length) writeMigration("create_functions", `-- Functions (generated from the source database)\n\n${fnSql.join("\n\n")}`);

const trgSql = triggers
  .filter((t) => !existingSql.includes(`"${t.name}"`) && !existingSql.includes(` ${t.name} `))
  .filter((t) => existingSql.includes(`FUNCTION ${t.function}(`) || fnSql.some((f) => f.includes(`FUNCTION public.${t.function}(`)))
  .map((t) => `DROP TRIGGER IF EXISTS ${q(t.name)} ON ${q(t.table)};\n${portable(t.def).replace(/ ON public\./, " ON ")};`);
if (trgSql.length) writeMigration("create_triggers", `-- Triggers (generated from the source database)\n\n${trgSql.join("\n\n")}`);

console.log(written.length
  ? `Wrote ${written.length} migrations:\n  ${written.join("\n  ")}`
  : "Nothing to do — prisma/migrations already covers every table in the source database.");
