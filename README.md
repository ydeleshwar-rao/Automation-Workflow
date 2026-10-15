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

## 2. Choose a database: PostgreSQL or Supabase

The app runs on either. One setting in each app picks it, and they must match:

| | Plain PostgreSQL (default) | Supabase |
|---|---|---|
| `backend` → `DB_PROVIDER` | `postgres` | `supabase` |
| `frontend` → `NEXT_PUBLIC_AUTH_PROVIDER` | `postgres` | `supabase` |
| Database queries | `pg` driver, via our query builder (`backend/src/lib/db/`) | Supabase client (PostgREST) |
| Login accounts | `auth_users` table, scrypt-hashed passwords | Supabase Auth |
| Google sign-in | Google ID token, needs `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Supabase Google provider |
| Forgot password email | Backend sends it through `SMTP_*` (dev: link printed in backend log) | Supabase sends it |

Services use the same `supabase.from(...)` code either way; only `backend/src/config/db.config.ts` switches.

## 3. Environment files

| File | Copy from | Used when |
|---|---|---|
| `backend/.env.development` | `backend/.env.example` | `bun dev` |
| `backend/.env.production` | `backend/.env.example` | `bun start` |
| `frontend/.env.local` | `frontend/.env.local.example` | always |

Each example file explains every variable. Minimum for local PostgreSQL:

```
# backend/.env.development
DB_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/automation_workflow
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/automation_workflow
JWT_ACCESS_SECRET=…   JWT_REFRESH_SECRET=…   REDIS_URL=redis://localhost:6379

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AUTH_PROVIDER=postgres
```

## 4. Database

Migrations live in `backend/prisma/migrations/`, one per table, applied in order.

**Local PostgreSQL, first time:** create the database (PowerShell):

```
& "C:\Program Files\PostgreSQL\13\bin\psql.exe" -U postgres -c "CREATE DATABASE automation_workflow"
```

**Import table definitions from Supabase:** this is needed once, for tables that so far exist only in the
Supabase project. Put `SUPABASE_DB_URL=` (Supabase → Project Settings → Database → direct URI, port 5432)
in `backend/.env.development`, then:

```
cd backend
bun scripts/generate-migrations-from-db.ts
```

It only reads the schema (no data). It writes one new migration per missing table, plus any missing columns,
functions and triggers. Commit the new folders.

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

The first account: open http://localhost:3000/sign-up (individual or company), or /setup for a
company admin with email and password.

## Sign-in options: individuals and company SSO (postgres provider)

| Who | How they sign up / in | Workspace |
|---|---|---|
| Individual | Email + password, personal Google (gmail.com) or Microsoft (outlook.com) | Personal workspace; they are its admin |
| Company admin | `/sign-up` → **For my company** → Google Workspace or Microsoft 365 work account | Company workspace bound to that Workspace domain / Microsoft tenant |
| Employee | **Continue with Google/Microsoft**, or **Sign in with company SSO** (work email) | Joins the company automatically as a developer with **no page access** until an admin grants it |

- A company is tied to the identity provider's **verified** tenant (Google `hd` domain, Microsoft `tid`). It is
  not tied to an email domain the user typed, and each tenant can belong to only one workspace.
- Existing workspaces can connect SSO later: **Admin → Company SSO → Connect**.
- **Require company SSO** (same page) blocks password login for members and email sign-ups from the domain.
  It can only be turned on by an admin who can sign in with company SSO, so nobody locks themselves out.
- Setup: Google OAuth client (`GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) and/or a Microsoft Entra
  app registration (`MICROSOFT_CLIENT_ID` / `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`); see the comments in
  `backend/.env.example`. Both use the redirect URI `http://localhost:3000/auth/callback`.
- Code: `backend/src/lib/auth/oidc.ts` (token verification), `backend/src/modules/sso/` (rules + `/sso/*` API),
  `frontend/src/lib/auth/provider.ts` (redirects + callback).

## 5. Run

```
bun dev                 # frontend + backend together (hot reload)
bun dev:frontend        # only the frontend
bun dev:backend         # only the backend
```

## 6. Build & start (production)

```
bun run build           # prisma generate + build backend (tsc) + build frontend (next build)
bun start               # start both
```

`build:frontend` / `build:backend` and `start:frontend` / `start:backend` work on one app.

## Other commands

```
bun run test            # backend tests
bun run --filter backend test:db   # query-builder tests; needs TEST_DATABASE_URL (empty, migrated DB)
bun run --filter backend test:sso  # company SSO rules + token checks; needs TEST_DATABASE_URL
bun run lint            # frontend lint
bun run prisma:generate # regenerate the Prisma client after editing schema.prisma
```
