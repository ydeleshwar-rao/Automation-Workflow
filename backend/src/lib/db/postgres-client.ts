/**
 * Plain-PostgreSQL implementation of the subset of the supabase-js query
 * builder this backend uses, so the same service code runs on Supabase or on
 * any PostgreSQL server (DB_PROVIDER=postgres).
 *
 *   supabase.from("t").select("a, b, rel(*)").eq("x", 1).order("a").limit(10)
 *   supabase.from("t").insert(row).select().single()
 *   supabase.from("t").upsert(rows, { onConflict: "id", ignoreDuplicates })
 *   supabase.from("t").update(values).eq(...)      .delete().in(...)
 *   supabase.rpc("fn", { arg: value })
 *
 * Results mirror PostgREST: { data, error, count, status, statusText }, never throw,
 * timestamps as ISO strings, bigint/numeric as numbers, single() → PGRST116 when
 * the row count is not exactly one, unknown column → PGRST204.
 */

import pg from "pg";

type Row = Record<string, unknown>;
type Primitive = string | number | boolean | null;

export type DbError = { message: string; code: string; details: string | null; hint: string | null };
export type DbResult<T = any> = {
  data: T;
  error: DbError | null;
  count: number | null;
  status: number;
  statusText: string;
};

// ── Type parsing (match PostgREST JSON output) ─────────────────────────────

const isoTimestamp = (value: string) => {
  const iso = value.replace(" ", "T");
  return /[+-]\d\d$/.test(iso) ? `${iso}:00` : iso;
};

const PARSERS: Record<number, (value: string) => unknown> = {
  20: (v) => Number(v),            // int8
  1700: (v) => Number(v),          // numeric
  1082: (v) => v,                  // date
  1114: (v) => v.replace(" ", "T"), // timestamp
  1184: isoTimestamp,              // timestamptz
};

const types = {
  getTypeParser(oid: number, format?: any) {
    return PARSERS[oid] ?? pg.types.getTypeParser(oid, format);
  },
};

// ── Schema metadata (column types, primary keys, foreign keys) ─────────────

type ColumnInfo = { dataType: string; udtName: string };
type ForeignKey = { table: string; column: string; foreignTable: string; foreignColumn: string };

class SchemaCache {
  private columns = new Map<string, Map<string, ColumnInfo>>();
  private primaryKeys = new Map<string, string[]>();
  private foreignKeys: ForeignKey[] = [];
  private loading: Promise<void> | null = null;

  constructor(private pool: pg.Pool) {}

  async ensure(table: string) {
    if (!this.loading) this.loading = this.load();
    await this.loading;
    if (!this.columns.has(table)) {
      // Table created after startup (e.g. by a migration) — reload once
      this.loading = this.load();
      await this.loading;
    }
  }

  private async load() {
    const [cols, pks, fks] = await Promise.all([
      this.pool.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns WHERE table_schema = 'public'`),
      this.pool.query(`
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu USING (constraint_schema, constraint_name)
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position`),
      this.pool.query(`
        SELECT cl.relname AS table, a.attname AS column, fcl.relname AS foreign_table, fa.attname AS foreign_column
        FROM pg_constraint c
        JOIN pg_class cl  ON cl.oid  = c.conrelid
        JOIN pg_class fcl ON fcl.oid = c.confrelid
        JOIN pg_attribute a  ON a.attrelid  = c.conrelid  AND a.attnum  = c.conkey[1]
        JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
        WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`),
    ]);

    this.columns = new Map();
    for (const r of cols.rows) {
      if (!this.columns.has(r.table_name)) this.columns.set(r.table_name, new Map());
      this.columns.get(r.table_name)!.set(r.column_name, { dataType: r.data_type, udtName: r.udt_name });
    }
    this.primaryKeys = new Map();
    for (const r of pks.rows) {
      this.primaryKeys.set(r.table_name, [...(this.primaryKeys.get(r.table_name) ?? []), r.column_name]);
    }
    this.foreignKeys = fks.rows.map((r) => ({
      table: r.table, column: r.column, foreignTable: r.foreign_table, foreignColumn: r.foreign_column,
    }));
  }

  column(table: string, column: string) {
    return this.columns.get(table)?.get(column);
  }

  primaryKey(table: string) {
    return this.primaryKeys.get(table) ?? ["id"];
  }

  /** Relationship used to embed `child` rows inside `parent` rows in a select. */
  relation(parent: string, child: string) {
    const manyToOne = this.foreignKeys.find((fk) => fk.table === parent && fk.foreignTable === child);
    if (manyToOne) return { kind: "one" as const, parentColumn: manyToOne.column, childColumn: manyToOne.foreignColumn };
    const oneToMany = this.foreignKeys.find((fk) => fk.table === child && fk.foreignTable === parent);
    if (oneToMany) return { kind: "many" as const, parentColumn: oneToMany.foreignColumn, childColumn: oneToMany.column };
    return null;
  }
}

// ── SQL helpers ────────────────────────────────────────────────────────────

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

class Params {
  values: unknown[] = [];
  add(value: unknown) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

/** Splits on commas that are not inside parentheses or double quotes. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0, quoted = false, current = "";
  for (const ch of input) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && depth === 0 && ch === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// ── Select list (columns, aliases, casts, json paths, embedded relations) ──

let aliasCounter = 0;

function buildSelectList(schema: SchemaCache, table: string, alias: string, columns: string): string {
  const items = splitTopLevel(columns.replace(/\s*\n\s*/g, " "));
  if (items.length === 0) return `${alias}.*`;

  return items.map((item) => {
    if (item === "*") return `${alias}.*`;

    // Embedded relation: [alias:]table[!hint](columns)
    const embed = item.match(/^(?:([\w ]+):)?([\w]+)(?:![\w]+)?\((.*)\)$/s);
    if (embed) {
      const [, outName, relTable, relColumns] = embed;
      const rel = schema.relation(table, relTable!);
      const name = ident(outName ?? relTable!);
      if (!rel) return `NULL AS ${name}`;
      const childAlias = `e${++aliasCounter}`;
      const inner = `SELECT ${buildSelectList(schema, relTable!, childAlias, relColumns || "*")}
        FROM ${ident(relTable!)} AS ${childAlias}
        WHERE ${childAlias}.${ident(rel.childColumn)} = ${alias}.${ident(rel.parentColumn)}`;
      return rel.kind === "one"
        ? `(SELECT row_to_json(_r) FROM (${inner} LIMIT 1) _r) AS ${name}`
        : `(SELECT COALESCE(json_agg(row_to_json(_r)), '[]'::json) FROM (${inner}) _r) AS ${name}`;
    }

    // Column: [alias:]column[->key|->>key...][::cast]
    const col = item.match(/^(?:([\w ]+):)?([\w ]+?)((?:->>?[\w]+)*)(?:::([\w]+))?$/);
    if (col) {
      const [, outName, column, path, cast] = col;
      let expr = `${alias}.${ident(column!.trim())}`;
      let name = outName ?? column!.trim();
      if (path) {
        for (const [, op, key] of path.matchAll(/(->>?)([\w]+)/g)) {
          expr += `${op}'${key!.replace(/'/g, "''")}'`;
          name = outName ?? key!;
        }
      }
      if (cast) expr = `(${expr})::${cast}`;
      return `${expr} AS ${ident(name)}`;
    }

    throw new Error(`Unsupported select item: ${item}`);
  }).join(", ");
}

// ── Query builder ──────────────────────────────────────────────────────────

type Action = "select" | "insert" | "update" | "upsert" | "delete";
type Filter = (alias: string, params: Params) => string;

const FILTER_OPS: Record<string, string> = {
  eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", ilike: "ILIKE",
};

class PostgresQueryBuilder implements PromiseLike<DbResult> {
  private action: Action = "select";
  private columns = "*";
  private returning = false;
  private countMode: "exact" | null = null;
  private head = false;
  private rows: Row[] = [];
  private values: Row = {};
  private onConflict: string | null = null;
  private ignoreDuplicates = false;
  private filters: Filter[] = [];
  private orders: string[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private cardinality: "single" | "maybeSingle" | null = null;
  private throwErrors = false;

  constructor(private pool: pg.Pool, private schema: SchemaCache, private table: string) {}

  // ── actions ──
  select(columns = "*", options: { count?: "exact" | "planned" | "estimated"; head?: boolean } = {}) {
    if (this.action === "select") {
      this.columns = columns;
      this.countMode = options.count ? "exact" : null;
      this.head = options.head ?? false;
    } else {
      this.columns = columns;
      this.returning = true;
    }
    return this;
  }

  insert(rows: Row | Row[], _options: { defaultToNull?: boolean } = {}) {
    this.action = "insert";
    this.rows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.action = "upsert";
    this.rows = Array.isArray(rows) ? rows : [rows];
    this.onConflict = options.onConflict ?? null;
    this.ignoreDuplicates = options.ignoreDuplicates ?? false;
    return this;
  }

  update(values: Row) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  // ── filters ──
  private compare(column: string, op: string, value: unknown) {
    this.filters.push((alias, params) => compareSql(this.schema, this.table, alias, params, column, op, value));
    return this;
  }

  eq(column: string, value: unknown)  { return this.compare(column, "eq", value); }
  neq(column: string, value: unknown) { return this.compare(column, "neq", value); }
  gt(column: string, value: unknown)  { return this.compare(column, "gt", value); }
  gte(column: string, value: unknown) { return this.compare(column, "gte", value); }
  lt(column: string, value: unknown)  { return this.compare(column, "lt", value); }
  lte(column: string, value: unknown) { return this.compare(column, "lte", value); }
  like(column: string, pattern: string)  { return this.compare(column, "like", pattern); }
  ilike(column: string, pattern: string) { return this.compare(column, "ilike", pattern); }
  is(column: string, value: boolean | null) { return this.compare(column, "is", value); }
  in(column: string, values: readonly unknown[]) { return this.compare(column, "in", values); }
  contains(column: string, value: unknown)    { return this.compare(column, "cs", value); }
  containedBy(column: string, value: unknown) { return this.compare(column, "cd", value); }

  match(query: Row) {
    for (const [column, value] of Object.entries(query)) this.eq(column, value);
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push((alias, params) =>
      `NOT (${compareSql(this.schema, this.table, alias, params, column, op, parseFilterValue(op, value))})`);
    return this;
  }

  filter(column: string, op: string, value: unknown) {
    return this.compare(column, op, parseFilterValue(op, value));
  }

  /** PostgREST logic-tree syntax, e.g. "a.is.null,b.gt.5" or "and(a.eq.1,b.eq.2)" */
  or(expression: string, _options: { referencedTable?: string; foreignTable?: string } = {}) {
    this.filters.push((alias, params) => logicSql(this.schema, this.table, alias, params, expression, "OR"));
    return this;
  }

  // ── modifiers ──
  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string; foreignTable?: string } = {}) {
    if (options.referencedTable || options.foreignTable) return this; // ordering embedded rows is not supported
    const dir = options.ascending === false ? "DESC" : "ASC";
    const nulls = options.nullsFirst === undefined ? "" : options.nullsFirst ? " NULLS FIRST" : " NULLS LAST";
    this.orders.push(`${ident(column)} ${dir}${nulls}`);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.cardinality = "single";
    return this as unknown as PromiseLike<DbResult<any>>;
  }

  maybeSingle() {
    this.cardinality = "maybeSingle";
    return this as unknown as PromiseLike<DbResult<any>>;
  }

  throwOnError() {
    this.throwErrors = true;
    return this;
  }

  returns<_T>() {
    return this;
  }

  // ── execution ──
  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<DbResult> {
    try {
      await this.schema.ensure(this.table);
      const result = await this.run();
      if (this.throwErrors && result.error) throw result.error;
      return result;
    } catch (err) {
      if (this.throwErrors) throw err;
      return failure(toDbError(err, this.table));
    }
  }

  private where(alias: string, params: Params) {
    const clauses = this.filters.map((f) => f(alias, params));
    return clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  }

  private tail(alias: string) {
    let sql = this.orders.length ? ` ORDER BY ${this.orders.map((o) => `${alias}.${o}`).join(", ")}` : "";
    if (this.limitCount !== null) sql += ` LIMIT ${Math.max(0, Math.floor(this.limitCount))}`;
    if (this.offsetCount !== null) sql += ` OFFSET ${Math.max(0, Math.floor(this.offsetCount))}`;
    return sql;
  }

  private async run(): Promise<DbResult> {
    const t = ident(this.table);
    const params = new Params();

    if (this.action === "select") {
      let count: number | null = null;
      if (this.countMode) {
        const countParams = new Params();
        const res = await this.pool.query(`SELECT count(*)::int AS n FROM ${t} AS t0${this.where("t0", countParams)}`, countParams.values);
        count = res.rows[0].n;
      }
      if (this.head) return success(null, count);
      const sql = `SELECT ${buildSelectList(this.schema, this.table, "t0", this.columns)} FROM ${t} AS t0${this.where("t0", params)}${this.tail("t0")}`;
      const res = await this.pool.query(sql, params.values);
      return this.shape(res.rows, count);
    }

    let mutation: string;
    if (this.action === "insert" || this.action === "upsert") {
      const rows = this.rows.map(dropUndefined);
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      if (cols.length === 0) {
        mutation = `INSERT INTO ${t} AS t0 DEFAULT VALUES`;
      } else {
        const tuples = rows.map((r) =>
          `(${cols.map((c) => (c in r ? params.add(this.prepare(c, r[c])) : "DEFAULT")).join(", ")})`);
        mutation = `INSERT INTO ${t} AS t0 (${cols.map(ident).join(", ")}) VALUES ${tuples.join(", ")}`;
      }
      if (this.action === "upsert") {
        const conflict = this.onConflict
          ? this.onConflict.split(",").map((c) => c.trim())
          : this.schema.primaryKey(this.table);
        const updates = cols.filter((c) => !conflict.includes(c));
        mutation += ` ON CONFLICT (${conflict.map(ident).join(", ")}) ` + (
          this.ignoreDuplicates || updates.length === 0
            ? "DO NOTHING"
            : `DO UPDATE SET ${updates.map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`).join(", ")}`
        );
      }
    } else if (this.action === "update") {
      const values = dropUndefined(this.values);
      const sets = Object.entries(values).map(([c, v]) => `${ident(c)} = ${params.add(this.prepare(c, v))}`);
      if (sets.length === 0) return success(this.returning ? [] : null, null);
      mutation = `UPDATE ${t} AS t0 SET ${sets.join(", ")}${this.where("t0", params)}`;
    } else {
      mutation = `DELETE FROM ${t} AS t0${this.where("t0", params)}`;
    }

    if (!this.returning) {
      const res = await this.pool.query(mutation, params.values);
      return success(null, this.countMode ? res.rowCount : null, this.action === "insert" ? 201 : 200);
    }

    const sql = `WITH _m AS (${mutation} RETURNING t0.*)
      SELECT ${buildSelectList(this.schema, this.table, "t0", this.columns)} FROM _m AS t0${this.tail("t0")}`;
    const res = await this.pool.query(sql, params.values);
    return this.shape(res.rows, null, this.action === "insert" ? 201 : 200);
  }

  private shape(rows: Row[], count: number | null, status = 200): DbResult {
    if (this.cardinality === null) return success(rows, count, status);
    if (rows.length === 1) return success(rows[0], count, status);
    if (rows.length === 0 && this.cardinality === "maybeSingle") return success(null, count, status);
    return failure({
      code: "PGRST116",
      message: "JSON object requested, multiple (or no) rows returned",
      details: `The result contains ${rows.length} rows`,
      hint: null,
    }, 406);
  }

  /** JSON columns get JSON text; Postgres arrays get JS arrays; everything else as-is. */
  private prepare(column: string, value: unknown) {
    return prepareValue(this.schema.column(this.table, column), value);
  }
}

function prepareValue(info: ColumnInfo | undefined, value: unknown) {
  if (value === null || value === undefined) return null;
  if (info && (info.udtName === "json" || info.udtName === "jsonb")) return JSON.stringify(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value) && info?.dataType !== "ARRAY") return JSON.stringify(value);
  if (typeof value === "object" && !Array.isArray(value) && !Buffer.isBuffer(value)) return JSON.stringify(value);
  return value;
}

function dropUndefined(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}

/** Turns a raw PostgREST filter value ("null", "(a,b)", "*x*") into a JS value. */
function parseFilterValue(op: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (op === "is") return value === "null" ? null : value === "true" ? true : value === "false" ? false : value;
  if (op === "in") {
    return splitTopLevel(value.replace(/^\(|\)$/g, "")).map((v) => v.replace(/^"|"$/g, ""));
  }
  if (op === "like" || op === "ilike") return value.replace(/\*/g, "%");
  if (op === "cs" || op === "cd") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

function compareSql(schema: SchemaCache, table: string, alias: string, params: Params, column: string, op: string, value: unknown): string {
  const col = `${alias}.${ident(column)}`;
  const info = schema.column(table, column);
  switch (op) {
    case "eq":
      return value === null ? `${col} IS NULL` : `${col} = ${params.add(prepareValue(info, value))}`;
    case "neq":
      return value === null ? `${col} IS NOT NULL` : `${col} <> ${params.add(prepareValue(info, value))}`;
    case "is":
      if (value === null) return `${col} IS NULL`;
      if (value === true) return `${col} IS TRUE`;
      if (value === false) return `${col} IS FALSE`;
      return `${col} IS ${params.add(value)}`;
    case "in": {
      const list = Array.isArray(value) ? value : [value];
      return list.length === 0 ? "FALSE" : `${col} = ANY(${params.add(list as Primitive[])})`;
    }
    case "cs":
    case "cd": {
      const sqlOp = op === "cs" ? "@>" : "<@";
      if (info?.udtName === "json" || info?.udtName === "jsonb") {
        return `${col}::jsonb ${sqlOp} ${params.add(JSON.stringify(value))}::jsonb`;
      }
      return `${col} ${sqlOp} ${params.add(value)}`;
    }
    default: {
      const sqlOp = FILTER_OPS[op];
      if (!sqlOp) throw new Error(`Unsupported filter operator: ${op}`);
      return `${col} ${sqlOp} ${params.add(prepareValue(info, value))}`;
    }
  }
}

function logicSql(schema: SchemaCache, table: string, alias: string, params: Params, expression: string, joiner: "OR" | "AND"): string {
  const parts = splitTopLevel(expression).map((part) => {
    const group = part.match(/^(not\.)?(and|or)\((.*)\)$/s);
    if (group) {
      const sql = logicSql(schema, table, alias, params, group[3]!, group[2] === "and" ? "AND" : "OR");
      return group[1] ? `NOT ${sql}` : sql;
    }
    // column.op.value  or  column.not.op.value  (column names may contain spaces, not dots)
    const m = part.match(/^([^.]+)\.(not\.)?(\w+)\.(.*)$/s);
    if (!m) throw new Error(`Unsupported filter expression: ${part}`);
    const [, column, negate, op, raw] = m;
    const sql = compareSql(schema, table, alias, params, column!.trim(), op!, parseFilterValue(op!, raw!.replace(/^"|"$/g, "")));
    return negate ? `NOT (${sql})` : sql;
  });
  return `(${parts.join(` ${joiner} `)})`;
}

// ── Results & errors ───────────────────────────────────────────────────────

function success(data: unknown, count: number | null, status = 200): DbResult {
  return { data, error: null, count, status, statusText: status === 201 ? "Created" : "OK" };
}

function failure(error: DbError, status = 400): DbResult {
  return { data: null, error, count: null, status, statusText: "Error" };
}

function toDbError(err: unknown, table: string): DbError {
  const e = err as { message?: string; code?: string; detail?: string; hint?: string };
  const message = e?.message ?? String(err);
  // Undefined column → PostgREST's "column not in schema cache" code
  if (e?.code === "42703") {
    const column = message.match(/column "?([^"]+?)"? of relation|column [\w.]*"?([^"\s]+)"? does not exist/);
    const name = column?.[1] ?? column?.[2] ?? "";
    return { code: "PGRST204", message: `Could not find the '${name}' column of '${table}' in the schema cache`, details: message, hint: null };
  }
  return { code: e?.code ?? "", message, details: e?.detail ?? null, hint: e?.hint ?? null };
}

// ── Client ─────────────────────────────────────────────────────────────────

export function createPostgresClient(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    types,
    options: "-c TimeZone=UTC",
    max: Number(process.env.PG_POOL_MAX ?? 10),
  });
  const schema = new SchemaCache(pool);

  return {
    pool,

    from(table: string) {
      return new PostgresQueryBuilder(pool, schema, table);
    },

    async rpc(fn: string, args: Row = {}): Promise<DbResult> {
      try {
        const params = new Params();
        const named = Object.entries(args).map(([k, v]) => `${ident(k)} => ${params.add(prepareValue(undefined, v))}`);
        const res = await pool.query(`SELECT * FROM ${ident(fn)}(${named.join(", ")})`, params.values);
        // Scalar / void functions return one row with a single column named after the function
        if (res.fields.length === 1 && res.fields[0]!.name === fn) {
          const value = res.rows[0]?.[fn];
          return success(value === "" ? null : value ?? null, null);
        }
        return success(res.rows, null);
      } catch (err) {
        return failure(toDbError(err, fn));
      }
    },
  };
}

export type PostgresClient = ReturnType<typeof createPostgresClient>;
