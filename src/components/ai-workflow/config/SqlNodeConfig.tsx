import React from "react";
import { cn } from "@/src/lib/utils";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function SqlNodeConfig({ config, onChange }: Props) {
  const db_url = (config.db_url as string) ?? "";
  const auto_schema = (config.auto_schema as boolean) ?? true;
  const schema_hint = (config.schema_hint as string) ?? "";
  const allowed_tables = (config.allowed_tables as string) ?? "";
  const safe_mode = (config.safe_mode as boolean) ?? true;
  const max_rows = (config.max_rows as number) ?? 100;
  const explain_results = (config.explain_results as boolean) ?? true;
  const system_prompt =
    (config.system_prompt as string) ??
    "";
  const complexity = (config.complexity as number) ?? 5;
  const temperature = (config.temperature as number) ?? 0.0;
  const max_tokens = (config.max_tokens as number) ?? 1024;

  return (
    <div className="space-y-4">
      {/* Section: Database */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Database
      </p>

      {/* db_url */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Database URL
        </label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="text"
            value={db_url}
            onChange={(e) => onChange({ ...config, db_url: e.target.value })}
            placeholder="postgresql://user:pass@host:5432/db"
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="nm-inset rounded-xl p-3 text-[11px] text-amber-400 leading-relaxed">
          Connection URL is never logged. Only host:port is shown in traces.
        </div>
        <p className="text-[11px] text-muted-foreground">
          Supports PostgreSQL, MySQL, SQLite, Supabase
        </p>
      </div>

      {/* auto_schema */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Auto Schema
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange({ ...config, auto_schema: true })}
            className={cn(
              auto_schema
                ? "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all"
                : "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all"
            )}
          >
            ON
          </button>
          <button
            onClick={() => onChange({ ...config, auto_schema: false })}
            className={cn(
              !auto_schema
                ? "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all"
                : "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all"
            )}
          >
            OFF
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Introspects DB structure automatically
        </p>
      </div>

      {/* schema_hint */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Schema Hint (optional)
        </label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={3}
            value={schema_hint}
            onChange={(e) => onChange({ ...config, schema_hint: e.target.value })}
            placeholder="TABLE users (id INT, name TEXT, email TEXT)..."
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-mono"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Overrides auto-schema if provided
        </p>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Permissions */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Permissions
      </p>

      {/* allowed_tables */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Allowed Tables
        </label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="text"
            value={allowed_tables}
            onChange={(e) =>
              onChange({ ...config, allowed_tables: e.target.value })
            }
            placeholder="users, orders, products"
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Comma-separated. Leave blank to allow all tables
        </p>
      </div>

      {/* safe_mode */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Safe Mode
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange({ ...config, safe_mode: true })}
            className={cn(
              safe_mode
                ? "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all"
                : "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all"
            )}
          >
            ON
          </button>
          <button
            onClick={() => onChange({ ...config, safe_mode: false })}
            className={cn(
              !safe_mode
                ? "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all"
                : "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all"
            )}
          >
            OFF
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Blocks INSERT, UPDATE, DELETE, DROP — SELECT only
        </p>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Results */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Results
      </p>

      {/* max_rows */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Max Rows
        </label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={5000}
            value={max_rows}
            onChange={(e) =>
              onChange({ ...config, max_rows: Number(e.target.value) })
            }
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* explain_results */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Explain Results
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onChange({ ...config, explain_results: true })}
            className={cn(
              explain_results
                ? "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all"
                : "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all"
            )}
          >
            ON
          </button>
          <button
            onClick={() => onChange({ ...config, explain_results: false })}
            className={cn(
              !explain_results
                ? "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all"
                : "nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all"
            )}
          >
            OFF
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          LLM writes a plain-English summary of the query results
        </p>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Prompt */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Prompt
      </p>

      {/* system_prompt */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          System Prompt
        </label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={3}
            value={system_prompt}
            onChange={(e) =>
              onChange({ ...config, system_prompt: e.target.value })
            }
            placeholder="You are a SQL expert. Convert the user's natural language question into a valid SQL SELECT query. Return ONLY the SQL query — no markdown, no explanation."
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-mono"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Model Settings */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Model Settings
      </p>

      {/* complexity */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Complexity
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={complexity}
            onChange={(e) =>
              onChange({ ...config, complexity: Number(e.target.value) })
            }
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
            {complexity}
          </span>
        </div>
      </div>

      {/* temperature */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Temperature
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) =>
              onChange({ ...config, temperature: Number(e.target.value) })
            }
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
            {temperature.toFixed(1)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          0.0 = deterministic SQL generation (recommended)
        </p>
      </div>

      {/* max_tokens */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Max Tokens
        </label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            value={max_tokens}
            onChange={(e) =>
              onChange({ ...config, max_tokens: Number(e.target.value) })
            }
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Output info */}
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        Output: {"{ sql, columns, results[], row_count, explanation, truncated }"}
      </div>
    </div>
  );
}
