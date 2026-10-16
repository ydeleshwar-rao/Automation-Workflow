# Automation Workflow — Coding Standards

These rules apply to all code in `backend/` and `frontend/`. Follow them for every change, new or refactored.

## 1. Before writing code: name the problem first

1. State the problem in one sentence (what is wrong or missing, and for whom).
2. Find the existing code that already touches it — reuse or extend it before adding something new.
3. Pick the design pattern that fits the problem (table below). If no pattern fits, write plain functions — do not force a pattern.
4. Then write the code.

## 2. SOLID principles

| Principle | What it means here |
|---|---|
| **S** — Single Responsibility | One reason to change per file/class/function. Routes only map URLs, controllers only handle HTTP (read request, call service, send response), services hold business logic, repositories hold database access. |
| **O** — Open/Closed | Add new behaviour by adding a new module, not by editing a growing `if/else` or `switch`. Example: a new integration = a new adapter registered in the adapter registry. |
| **L** — Liskov Substitution | Every implementation of an interface must be usable wherever the interface is expected — same inputs, same kind of outputs, no surprise exceptions. |
| **I** — Interface Segregation | Keep interfaces small and focused. Do not make a class implement methods it does not need. |
| **D** — Dependency Inversion | Business logic depends on interfaces, not concrete clients. Pass dependencies in (constructor/function parameter) so they can be replaced in tests. |

## 3. Design patterns we use — and when

| Problem | Pattern | Where |
|---|---|---|
| Database access | **Repository** — one repository per aggregate/table group, the only place that calls Prisma | `backend/src/modules/<module>/repositories/` |
| Many integrations with the same operations (ServiceM8, simPRO, Commusoft, …) | **Adapter** + **Registry** | `webhook-engine/adapters`, `polling-engine/adapters` |
| Choosing an implementation at runtime | **Strategy** / **Factory** | e.g. auth provider, mail transport |
| One shared resource (DB client, logger, queue connection) | **Singleton** module export | `backend/src/lib/prisma.ts` |
| Cross-cutting request concerns (auth, rate limit, metrics, errors) | **Middleware** (Chain of Responsibility) | `backend/src/middlewares/` |
| Workflow steps / nodes executed in sequence | **Command** / **Pipeline** | `workflow-automation` |
| Frontend: shared server state | RTK Query API slice per feature | `frontend/src/**/apiIntegrations/` |
| Frontend: reusable UI logic | Custom hook (`useSomething`) | `frontend/src/hooks/` |

## 4. Backend layering

```
route  →  controller  →  service  →  repository  →  Prisma
```

- **Prisma is the only database access layer.** Never call the database from a controller or a route. Never write raw SQL strings unless Prisma cannot express the query — then use `prisma.$queryRaw` with tagged-template parameters (never string concatenation).
- All routes live under the versioned prefix `/api/v1` (`backend/src/config/api.config.ts`).
- Throw `ApiError` for expected failures; let the global `errorHandler` format the response.
- Validate request input at the controller boundary (DTO / zod schema) before it reaches a service.

## 5. Readable code — naming rules

**No single-letter or cryptic names.** Code is read far more often than it is written.

```ts
// ❌ Avoid
rows.map((r) => r.id)
users.filter((u) => u.active)
const s = await getSub(id)
catch (e) { ... }

// ✅ Do
rows.map((row) => row.id)
users.filter((user) => user.isActive)
const subscription = await getSubscription(subscriptionId)
catch (error) { ... }
```

- Variables and parameters: full descriptive nouns — `workflow`, `webhookEvent`, `integrationKey`.
- Functions: verb + noun — `createWorkflow`, `findActiveSubscriptions`, `sendResetPasswordEmail`.
- Booleans: `is` / `has` / `can` / `should` prefix — `isConnected`, `hasPermission`.
- Constants: `UPPER_SNAKE_CASE`. Types/interfaces/classes: `PascalCase`. Files: match the existing module style (`webhook.service.ts`).
- The only accepted short names: `id`, `url`, `db` (only inside the Prisma singleton), and `index` loops where `i` is truly a plain counter in a short `for` loop.
- No abbreviations like `cfg`, `res2`, `tmp`, `obj`, `val`, `arr`, `sub`, `msg` — write the full word.

## 6. Clean code

- Functions do one thing and stay short (aim for under ~40 lines). Extract a well-named helper instead of adding a comment that explains a block.
- No magic numbers or strings — put them in a named constant.
- Prefer early returns over deep nesting.
- No dead code, commented-out code, or unused imports — delete it (git keeps the history).
- Comments explain **why**, not **what**.
- Strong types: no `any` in new code; use `unknown` and narrow it.
- Keep the same style as the surrounding code.
