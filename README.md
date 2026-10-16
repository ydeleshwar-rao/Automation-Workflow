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

## 2. Architecture: PostgreSQL + Prisma

- **Database:** PostgreSQL only. **Prisma** is the only data-access layer.
- **Single source of truth:** `backend/prisma/schema.prisma`. Model names are PascalCase; field names are
  exactly the column names (snake_case), which are also the JSON keys the API returns.
- **Layers:** `route → controller → service → repository → Prisma`. Repositories (`*.repository.ts`) are the
  only files that call Prisma. Coding rules: see [CLAUDE.md](CLAUDE.md).
- **API:** every backend route is under `/api/v1` (`backend/src/config/api.config.ts`).
- **Login accounts:** `auth_users` table (scrypt-hashed passwords), Google / Microsoft ID tokens and company SSO,
  all verified by the backend. Forgot-password emails go through `SMTP_*` (dev: link printed in the backend log).
- **Integrations** (ServiceM8, Commusoft, simPRO, Zoho, Google, Razorpay, LeadsHub) store **credentials and
  configuration only**. Vendor data (jobs, customers, invoices…) is fetched live from the vendor API, never copied.

## 3. Environment files

| File | Copy from | Used when |
|---|---|---|
| `backend/.env.development` | `backend/.env.example` | `bun dev` |
| `backend/.env.production` | `backend/.env.example` | `bun start` |
| `frontend/.env.local` | `frontend/.env.local.example` | always |

Each example file explains every variable. Minimum for local PostgreSQL:

```
# backend/.env.development
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/automation_workflow
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/automation_workflow
JWT_ACCESS_SECRET=…   JWT_REFRESH_SECRET=…   REDIS_URL=redis://localhost:6379

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000      # backend origin, without /api/v1
```

## 4. Database

**First time:** create the database (PowerShell), then apply all migrations:

```
& "C:\Program Files\PostgreSQL\13\bin\psql.exe" -U postgres -c "CREATE DATABASE automation_workflow"
cd backend
bun run db:migrate          # prisma migrate deploy — applies backend/prisma/migrations in order
```

`bun install` runs `prisma generate` automatically, so the typed Prisma client is always up to date.

**Changing the schema** (run from `backend/`):

1. Edit `prisma/schema.prisma`.
2. `bun run db:migrate:create -- --name <what_changed>` — writes a new migration folder (does not apply it).
3. Review the generated `migration.sql`, then `bun run db:migrate` to apply it.
4. Commit `schema.prisma` and the new migration folder together.

Check constraints and expression indexes (e.g. case-insensitive email uniqueness) cannot be written in
`schema.prisma`; they live in the hand-written SQL migrations and Prisma leaves them alone.

Other commands: `bun run db:migrate:status`, `bun run db:studio` (browse data), `bun run db:generate`.
To migrate production, set `NODE_ENV` first so `backend/.env.production` is used —
PowerShell: `$env:NODE_ENV="production"; bun run db:migrate` (bash: `NODE_ENV=production bun run db:migrate`).

The first account: open http://localhost:3000/sign-up (individual or company), or /setup for a
company admin with email and password.

## Sign-in options: individuals and company SSO

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
- Code: `backend/src/lib/auth/oidc.ts` (token verification), `backend/src/modules/sso/` (rules + `/api/v1/sso/*` API),
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
bun run --filter backend test:sso  # company SSO rules + token checks; needs TEST_DATABASE_URL
bun run lint            # frontend lint
bun run prisma:generate # regenerate the Prisma client after editing schema.prisma
```
