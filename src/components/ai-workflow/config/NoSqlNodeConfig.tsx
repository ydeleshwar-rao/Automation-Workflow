import React from 'react'
import { cn } from '@/src/lib/utils'

type DbType = 'mongodb' | 'redis' | 'elasticsearch'

interface Props {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

const DB_TYPES = [
  { id: 'mongodb', label: 'MongoDB', icon: '🍃' },
  { id: 'redis', label: 'Redis', icon: '🔴' },
  { id: 'elasticsearch', label: 'Elastic', icon: '🔍' },
]

export function NoSqlNodeConfig({ config, onChange }: Props) {
  const dbType = (config.db_type as DbType) ?? 'mongodb'
  const connectionUrl = (config.connection_url as string) ?? ''
  const database = (config.database as string) ?? ''
  const collection = (config.collection as string) ?? ''
  const esIndex = (config.es_index as string) ?? ''
  const safeMode = (config.safe_mode as boolean) ?? true
  const maxResults = (config.max_results as number) ?? 100
  const schemaHint = (config.schema_hint as string) ?? ''
  const explainResults = (config.explain_results as boolean) ?? true
  const complexity = (config.complexity as number) ?? 5
  const temperature = (config.temperature as number) ?? 0.0
  const maxTokens = (config.max_tokens as number) ?? 1024

  const connectionPlaceholder =
    dbType === 'mongodb'
      ? 'mongodb+srv://user:pass@cluster.mongodb.net'
      : dbType === 'redis'
      ? 'redis://user:pass@host:6379/0'
      : 'http://host:9200'

  const safeModeHint =
    dbType === 'mongodb'
      ? 'Blocks insert, update, delete, drop, replaceOne operations'
      : dbType === 'redis'
      ? 'Read-only commands only (GET, HGETALL, LRANGE, KEYS...)'
      : 'Blocks index, create, update, delete, bulk operations'

  const schemaPlaceholder =
    dbType === 'mongodb'
      ? 'Collection "users": { _id, name, email, createdAt }'
      : dbType === 'redis'
      ? 'Keys: user:{id} (Hash), session:{id} (String), queue (List)'
      : 'Index "logs": { timestamp, level, message, service }'

  const outputInfo =
    dbType === 'mongodb'
      ? 'Output: { db_type, query (JSON filter/aggregate), results[], row_count, explanation }'
      : dbType === 'redis'
      ? 'Output: { db_type, query (Redis command string), results[], row_count, explanation }'
      : 'Output: { db_type, query (Query DSL JSON), results[], total_hits, explanation }'

  return (
    <div className="space-y-4">

      {/* Section: Backend */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Backend</p>

      {/* db_type */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Database Type</label>
        <div className="grid grid-cols-3 gap-1.5">
          {DB_TYPES.map((db) => (
            <button
              key={db.id}
              onClick={() => onChange({ ...config, db_type: db.id })}
              className={
                dbType === db.id
                  ? 'nm-card rounded-xl p-2 text-center border-2 border-purple-500 bg-purple-500/10 transition-all'
                  : 'nm-card rounded-xl p-2 text-center border border-transparent hover:border-white/10 transition-all'
              }
            >
              <span className="text-base">{db.icon}</span>
              <p className="text-[10px] font-bold text-foreground mt-0.5">{db.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* connection_url */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Connection URL</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="text"
            value={connectionUrl}
            onChange={(e) => onChange({ ...config, connection_url: e.target.value })}
            placeholder={connectionPlaceholder}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="nm-inset rounded-xl p-3 text-[11px] text-amber-400 leading-relaxed">
          Connection URL is never logged.
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Collection / Index (conditional) */}
      {(dbType === 'mongodb' || dbType === 'elasticsearch') && (
        <>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Collection / Index</p>

          {/* database (MongoDB only) */}
          {dbType === 'mongodb' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Database Name</label>
              <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                <input
                  type="text"
                  value={database}
                  onChange={(e) => onChange({ ...config, database: e.target.value })}
                  placeholder="mydb"
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* collection (MongoDB only) */}
          {dbType === 'mongodb' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Collection (optional)</label>
              <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                <input
                  type="text"
                  value={collection}
                  onChange={(e) => onChange({ ...config, collection: e.target.value })}
                  placeholder="users"
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Leave blank — LLM picks the best collection</p>
            </div>
          )}

          {/* es_index (Elasticsearch only) */}
          {dbType === 'elasticsearch' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Index Name (optional)</label>
              <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                <input
                  type="text"
                  value={esIndex}
                  onChange={(e) => onChange({ ...config, es_index: e.target.value })}
                  placeholder="logs-2024-*"
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Leave blank to search all indices</p>
            </div>
          )}

          <div className="border-t border-white/5" />
        </>
      )}

      {/* Section: Permissions */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Permissions</p>

      {/* safe_mode */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Safe Mode</label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ ...config, safe_mode: true })}
            className={
              safeMode
                ? 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all'
                : 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all'
            }
          >
            ON
          </button>
          <button
            onClick={() => onChange({ ...config, safe_mode: false })}
            className={
              !safeMode
                ? 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all'
                : 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all'
            }
          >
            OFF
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">{safeModeHint}</p>
      </div>

      {/* max_results */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Max Results</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={5000}
            value={maxResults}
            onChange={(e) => onChange({ ...config, max_results: Number(e.target.value) })}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Schema */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Schema</p>

      {/* schema_hint */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Schema Hint (optional)</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={3}
            value={schemaHint}
            onChange={(e) => onChange({ ...config, schema_hint: e.target.value })}
            placeholder={schemaPlaceholder}
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-mono"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Overrides auto-introspection if provided</p>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Results */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Results</p>

      {/* explain_results */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Explain Results</label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ ...config, explain_results: true })}
            className={
              explainResults
                ? 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all'
                : 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all'
            }
          >
            ON
          </button>
          <button
            onClick={() => onChange({ ...config, explain_results: false })}
            className={
              !explainResults
                ? 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border-2 border-purple-500 bg-purple-500/10 text-purple-400 transition-all'
                : 'nm-card rounded-lg px-3 h-7 text-[11px] font-bold border border-transparent text-muted-foreground hover:text-foreground transition-all'
            }
          >
            OFF
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">LLM writes a plain-English summary</p>
      </div>

      <div className="border-t border-white/5" />

      {/* Section: Model Settings */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Model Settings</p>

      {/* complexity */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Complexity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={complexity}
            onChange={(e) => onChange({ ...config, complexity: Number(e.target.value) })}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{complexity}</span>
        </div>
      </div>

      {/* temperature */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Temperature</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) => onChange({ ...config, temperature: Number(e.target.value) })}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{temperature.toFixed(1)}</span>
        </div>
      </div>

      {/* max_tokens */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Max Tokens</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => onChange({ ...config, max_tokens: Number(e.target.value) })}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Output info banner */}
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        {outputInfo}
      </div>

    </div>
  )
}
