# Automation Workflow

Monorepo with a Next.js **frontend** and an Express **backend**, both running on [Bun](https://bun.com).
There is one `node_modules` and one `bun.lock` at the root; every command below is run from the root folder.

```
frontend/   Next.js app            → http://localhost:3000
backend/    Express API + workers  → http://localhost:5000
```

## 1. Install

Requires Bun 1.4+ (`powershell -c "irm bun.sh/install.ps1|iex"`) and a Redis server (BullMQ queues).

```
bun install
```

## 2. Environment files

| File | Copy from | Used when |
|---|---|---|
| `backend/.env.development` | `backend/.env.example` | `bun dev` |
| `backend/.env.production` | `backend/.env.example` | `bun start` |
| `frontend/.env.local` | `frontend/.env.local.example` | always |

Backend needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (pooler, port 6543),
`DIRECT_URL` (direct, port 5432), the JWT secrets, `PORT=5000`, `FRONTEND_URL` and `REDIS_URL`.
Frontend needs `NEXT_PUBLIC_API_URL=http://localhost:5000`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 3. Database

Migrations live in `backend/prisma/migrations/` — one per table, applied in order.

**New, empty database:**

```
bun run db:migrate
```

**Existing database that already has tables** (created earlier from `supabase-setup.sql`) — run once:

```
bun run db:migrate:existing
```

This applies every migration on top of what is there (keeps all data, adds anything missing,
converts old enum columns to text) and records them, so `bun run db:migrate` works from then on.

Check state with `bun run db:migrate:status`. To migrate production, set `NODE_ENV` first so
`backend/.env.production` is used — PowerShell: `$env:NODE_ENV="production"; bun run db:migrate`
(bash: `NODE_ENV=production bun run db:migrate`).

> Do **not** run `prisma migrate dev` or `prisma db push`: `schema.prisma` does not describe
> the `ai_workflows` tables or the DB-side defaults, so Prisma would try to drop/alter them.
> Add a new migration folder by hand instead (next number, `create_<table>` / `alter_<table>`).

## 4. Run

```
bun dev                 # frontend + backend together (hot reload)
bun dev:frontend        # only the frontend
bun dev:backend         # only the backend
```

## 5. Build & start (production)

```
bun run build           # prisma generate + build backend (tsc) + build frontend (next build)
bun start               # start both
```

`build:frontend` / `build:backend` and `start:frontend` / `start:backend` work on one app.

## Other commands

```
bun run test            # backend tests
bun run lint            # frontend lint
bun run prisma:generate # regenerate the Prisma client after editing schema.prisma
```
