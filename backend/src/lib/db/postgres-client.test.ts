/**
 * Integration tests for the PostgreSQL query builder + auth adapter.
 * Needs an empty, migrated database:
 *
 *   TEST_DATABASE_URL=postgresql://... bun test ./src/lib/db/postgres-client.test.ts
 *
 * Skipped when TEST_DATABASE_URL is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createPostgresClient } from "./postgres-client.js";
import { createPostgresAuth } from "./postgres-auth.js";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("postgres adapter", () => {
  const db = createPostgresClient(url ?? "");
  const auth = createPostgresAuth(db.pool);
  let userId = "";
  let orgId = "";

  beforeAll(async () => {
    await db.pool.query(`TRUNCATE organizations, auth_users, profiles RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await db.pool.end();
  });

  it("insert().select().single() returns the created row", async () => {
    const { data, error, status } = await db.from("organizations").insert({ name: "Acme" }).select("id, name").single();
    expect(error).toBeNull();
    expect(status).toBe(201);
    expect(data.name).toBe("Acme");
    orgId = data.id;
  });

  it("auth.admin.createUser + signInWithPassword", async () => {
    const created = await auth.admin.createUser({ email: "Jane@Acme.com", password: "secret-pass", user_metadata: { full_name: "Jane" } });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;
    expect(created.data.user!.email).toBe("jane@acme.com");

    const dup = await auth.admin.createUser({ email: "jane@acme.com", password: "x" });
    expect(dup.error?.message).toContain("already registered");

    expect((await auth.signInWithPassword({ email: "JANE@acme.com", password: "secret-pass" })).data.user?.id).toBe(userId);
    expect((await auth.signInWithPassword({ email: "jane@acme.com", password: "wrong" })).error?.message).toBe("Invalid login credentials");
  });

  it("upsert with onConflict, undefined values skipped", async () => {
    const row = { id: userId, email: "jane@acme.com", full_name: "Jane", role: "admin", organization_id: orgId, avatar_url: undefined };
    expect((await db.from("profiles").upsert(row, { onConflict: "id" })).error).toBeNull();
    const again = await db.from("profiles").upsert({ ...row, full_name: "Jane D", role: undefined }, { onConflict: "id" }).select("full_name, role").single();
    expect(again.data).toEqual({ full_name: "Jane D", role: "admin" });
  });

  it("filters: eq / in / is / not / or / ilike / gte, order + limit, count head", async () => {
    await db.from("workflows").insert([
      { user_id: userId, name: "A", status: "active", position: 1 },
      { user_id: userId, name: "B", status: "draft", position: 2, tag: "x" },
      { user_id: userId, name: "C", status: "inactive", position: 3 },
    ]);
    const names = async (q: PromiseLike<{ data: any }>) => ((await q).data ?? []).map((r: any) => r.name);

    expect(await names(db.from("workflows").select("name").eq("status", "active"))).toEqual(["A"]);
    expect(await names(db.from("workflows").select("name").in("status", ["draft", "inactive"]).order("name"))).toEqual(["B", "C"]);
    expect(await names(db.from("workflows").select("name").is("tag", null).order("name"))).toEqual(["A", "C"]);
    expect(await names(db.from("workflows").select("name").not("tag", "is", null))).toEqual(["B"]);
    expect(await names(db.from("workflows").select("name").or("tag.is.null,position.gte.3").order("name", { ascending: false }))).toEqual(["C", "A"]);
    expect(await names(db.from("workflows").select("name").ilike("name", "b"))).toEqual(["B"]);
    expect(await names(db.from("workflows").select("name").order("position", { ascending: false }).limit(1))).toEqual(["C"]);

    const { count, data } = await db.from("workflows").select("id", { count: "exact", head: true }).neq("status", "draft");
    expect(count).toBe(2);
    expect(data).toBeNull();
  });

  it("single() / maybeSingle() cardinality errors match PostgREST", async () => {
    const none = await db.from("workflows").select("*").eq("name", "nope").single();
    expect(none.error?.code).toBe("PGRST116");
    expect((await db.from("workflows").select("*").eq("name", "nope").maybeSingle()).data).toBeNull();
    expect((await db.from("workflows").select("*").maybeSingle()).error?.code).toBe("PGRST116");
  });

  it("jsonb columns: write objects/arrays, contains()", async () => {
    const { data: wf } = await db.from("workflows").select("id").eq("name", "A").single();
    const { data: node, error } = await db.from("workflow_nodes").insert({
      workflow_id: wf.id, type: "trigger", integration_key: "webhook", action_key: "catch", position: 0,
      config: { webhook_id: "abc", list: [1, 2] }, output_schema: [{ key: "a" }],
    }).select().single();
    expect(error).toBeNull();
    expect(node.config).toEqual({ webhook_id: "abc", list: [1, 2] });
    expect(node.output_schema).toEqual([{ key: "a" }]);
    expect(typeof node.created_at).toBe("string");
    expect(node.created_at).toMatch(/^\d{4}-\d\d-\d\dT.*\+00:00$/);

    const found = await db.from("workflow_nodes").select("id").contains("config", { webhook_id: "abc" });
    expect(found.data).toHaveLength(1);
  });

  it("embedded relations: many-to-one and one-to-many", async () => {
    const { data: tag } = await db.from("workflow_tags").insert({ user_id: userId, name: "urgent" }).select().single();
    const { data: wf } = await db.from("workflows").select("id").eq("name", "A").single();
    await db.from("workflow_tag_links").insert({ workflow_id: wf.id, tag_id: tag.id });

    const links = await db.from("workflow_tag_links").select("tag_id, workflow_tags(*)").eq("workflow_id", wf.id);
    expect(links.data?.[0].workflow_tags.name).toBe("urgent");

    const withNodes = await db.from("workflows").select("name, workflow_nodes(action_key)").eq("id", wf.id).single();
    expect(withNodes.data.workflow_nodes).toEqual([{ action_key: "catch" }]);
  });

  it("update().eq().select() and delete()", async () => {
    const upd = await db.from("workflows").update({ status: "inactive" }).eq("name", "B").select("name, status");
    expect(upd.data).toEqual([{ name: "B", status: "inactive" }]);
    expect((await db.from("workflows").delete().eq("name", "C")).error).toBeNull();
    expect((await db.from("workflows").select("name").eq("name", "C")).data).toEqual([]);
  });

  it("unknown column → PGRST204, CHECK violation → 23514", async () => {
    const bad = await db.from("workflows").update({ "Job Status": "x" }).eq("name", "A");
    expect(bad.error?.code).toBe("PGRST204");
    expect(bad.error?.message).toContain("Job Status");
    expect((await db.from("workflows").update({ status: "bogus" }).eq("name", "A")).error?.code).toBe("23514");
  });

  it("rpc() calls SQL functions", async () => {
    const { data: smtp } = await db.from("smtp_connections").insert({
      user_id: userId, name: "m", host: "h", port: 25, username: "u", encrypted_password: "p",
    }).select("id").single();
    const res = await db.rpc("increment_total_mail_sent", { smtp_id_input: smtp.id });
    expect(res.error).toBeNull();
    expect((await db.from("smtp_connections").select("total_sent").eq("id", smtp.id).single()).data.total_sent).toBe(1);
  });

  it("auth.admin.deleteUser cascades to the profile", async () => {
    expect((await auth.admin.deleteUser(userId)).error).toBeNull();
    expect((await db.from("profiles").select("id").eq("id", userId)).data).toEqual([]);
  });
});
