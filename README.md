# LaundryOS — Foundation

A production-grade foundation for a multi-role (Customer / Driver / Staff / Admin) laundry
marketplace platform — "Uber for laundry." This is **Phase 1** of a phased build: the schema,
auth, security, and core booking flow that every other feature (dispatch, staff workflow,
admin dashboards, AI features) will be layered onto.

## What's included in this phase

- **Database**: complete Prisma schema — users/roles, branches/zones/machines, orders and their
  full lifecycle, drivers/vehicles/earnings, staff/shifts/inventory, payments/wallet/loyalty/coupons,
  reviews, support tickets, notifications, audit logs, CMS/settings.
- **Auth**: Auth.js (NextAuth) with credentials + Google social login, bcrypt password hashing
  (cost 12), email verification gate, brute-force rate limiting on login, JWT sessions, role
  claims baked into the session.
- **Security**: role-based route middleware, CSRF origin checking on mutating API calls, Redis-backed
  rate limiting, security headers (HSTS, X-Frame-Options, etc.), secret redaction in logs, Zod
  validation on every input boundary, server-computed pricing (client never sets prices).
- **Core booking flow**: `POST /api/orders` — full repository/service layered implementation with
  address ownership checks, live service/extras pricing, coupon validation, tax calculation,
  atomic transaction, and status history tracking. `GET /api/orders` — paginated/filterable/sortable.
- **Real-time**: standalone Socket.io service (scales independently, Redis pub/sub adapter) for
  driver GPS + order status broadcast, JWT-authenticated handshake.
- **Infra**: multi-stage Dockerfile (non-root user, standalone Next.js output), docker-compose
  with Postgres + Redis + app + socket server, GitHub Actions CI (lint/typecheck/test/build/E2E),
  seed script, `.env.example` with every required secret documented.
- **Testing**: Vitest unit tests (see `tests/unit/order.schema.test.ts` for the pattern), Playwright
  wired into CI for E2E.

## Architecture

Clean/layered architecture, strictly one-directional:

```
API Route  →  Service (business rules, pricing, transactions)  →  Repository (Prisma queries only)
```

- **Routes** (`src/app/api/**/route.ts`): auth, validation, HTTP concerns only.
- **Services** (`src/server/services/*`): business logic, never touch `req`/`res`.
- **Repositories** (`src/server/repositories/*`): the *only* place Prisma is called directly.
- **Validation** (`src/server/validation/*`): Zod schemas, one per resource/action.

This keeps business logic testable without spinning up Next.js or a real database, and keeps
Prisma swappable if you ever need to change ORMs.

## Folder structure

```
laundry-app/
├── prisma/
│   ├── schema.prisma        # full data model
│   └── seed.ts               # sample branch, services, admin user, coupon
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/register/route.ts
│   │   │   └── orders/route.ts
│   │   └── ...                # pages go here in the next phase
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── logger.ts          # pino structured logger
│   │   └── rate-limit.ts      # Redis-backed rate limiter
│   ├── middleware.ts          # CSRF + role-gated routes
│   └── server/
│       ├── repositories/      # Prisma queries only
│       ├── services/          # business logic
│       ├── validation/        # Zod schemas
│       └── middleware/        # requireSession() RBAC helper
├── server/
│   └── socket.js              # standalone real-time server
├── docker/
│   ├── Dockerfile             # production Next.js image
│   └── Dockerfile.socket      # socket server image
├── tests/
│   ├── unit/
│   └── e2e/
├── .github/workflows/ci.yml
├── docker-compose.yml
└── .env.example
```

## A note on database setup right now

`docker compose up` runs a one-off `migrate` service that uses `prisma db push`
to sync the schema straight to Postgres, then seeds sample data — there's no
formal migration history yet (`prisma/migrations/`), since generating real
migration files requires running `prisma migrate dev` against a live database,
which isn't possible until the project runs somewhere with one. This is fine
for active development. Before this goes anywhere near production, run
`prisma migrate dev` locally once the schema has stabilized to generate a
proper initial migration, then switch `docker-compose.yml`'s `migrate` service
to `prisma migrate deploy`.

## Getting started

```bash
cp .env.example .env
# generate real secrets:
openssl rand -base64 32   # → NEXTAUTH_SECRET
openssl rand -base64 32   # → JWT_SIGNING_KEY

docker compose up
```

This runs migrations, seeds the database (admin login: `admin@laundryos.app` /
`Admin#12345` — **rotate immediately**), and starts the app on `http://localhost:3000`,
with the real-time server on `:3001`.

For local development without Docker:

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Deployment

- **Vercel**: works out of the box for the Next.js app; point `DATABASE_URL` at a managed
  Postgres (Railway, Supabase, or RDS) and `REDIS_URL` at a managed Redis (Upstash works well
  serverless). The Socket.io server needs a long-running host (Railway/Fly.io/ECS) since Vercel
  functions aren't persistent — Vercel + Pusher is the simpler managed alternative to self-hosted
  Socket.io if you want to stay fully serverless.
- **Self-hosted / VPS**: `docker compose up -d` covers app + Postgres + Redis + socket server
  end-to-end behind a reverse proxy (Caddy/Nginx) terminating TLS.
- **CI/CD**: `.github/workflows/ci.yml` lints, type-checks, runs unit + E2E tests, builds, and
  (on `main`) builds/pushes a production Docker image — plug in your registry secrets.

## Milestone progress

| Step | Scope | Status |
|---|---|---|
| 1 | Authentication | ✅ Done — register/login API, NextAuth session, RBAC middleware |
| 1 | Database | ✅ Done — full Prisma schema |
| 1 | Landing page | ✅ Done — `/` |
| 1 | Customer dashboard | ✅ Shell + overview done — `/dashboard`. Sub-pages (book, orders, addresses, wallet, profile) are linked but not yet built |
| 2 | Booking system | ✅ Done — branches/services/addresses APIs + full booking form UI |
| 2 | Pickup scheduling | ✅ Done — date + time slot picker in booking form |
| 2 | Order management | ✅ Done — order list (filterable/paginated), order detail, cancel |
| 3 | Admin dashboard | ❌ Not started |
| 3 | Laundry workflow (staff) | ❌ Not started |
| 3 | Driver assignment | ❌ Not started |
| 4 | Payments | ❌ Not started |
| 4 | Notifications | ❌ Not started |
| 4 | Maps | ❌ Not started |
| 5 | Reports / Analytics | ❌ Not started |
| 5 | Polish / Deployment | ⚠️ Docker + CI done, production polish pending |

## What's next (subsequent phases)

This foundation intentionally does not yet include: the actual UI (customer booking flow,
driver app, staff queue, admin dashboards), Stripe/GCash/Maya payment capture, S3 upload
endpoints, Resend/Twilio notification dispatch, automatic driver/branch assignment, Google Maps
routing, PDF invoice generation, AI chatbot/demand forecasting, and the reporting/export layer.
Each of those is a substantial slice on its own — happy to build them one at a time, in the same
tested, layered style, whenever you're ready.

## Security notes for whoever deploys this

- Rotate the seeded admin password and all `.env.example` placeholders before going anywhere
  near production traffic.
- `NEXTAUTH_SECRET` / `JWT_SIGNING_KEY` must be unique, high-entropy, and never reused across
  environments.
- Rate limits in `.env` are conservative defaults — tune `RATE_LIMIT_POINTS` per endpoint class
  once you have real traffic data.
- The `CORS_ALLOWED_ORIGINS` env var drives both API CORS and CSRF origin checks — keep it tight
  in production (no wildcards).
