# ishortn.ink — Developer Documentation

> **Internal reference for Moladira Skills developers.**
> Covers architecture, dependencies, local setup, and how click tracking works end-to-end.

---

## Table of Contents

1. [What is ishortn.ink?](#1-what-is-ishortnink)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Local Setup (Step-by-Step)](#4-local-setup-step-by-step)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [How Link Resolution Works](#7-how-link-resolution-works)
8. [How Click Tracking Works](#8-how-click-tracking-works)
9. [Authentication Architecture](#9-authentication-architecture)
10. [API Layer (tRPC)](#10-api-layer-trpc)
11. [Why Metrics Look Off in Dev](#11-why-metrics-look-off-in-dev)
12. [Useful Dev Commands](#12-useful-dev-commands)
13. [Docker — What It Does and What It Doesn't](#13-docker--what-it-does-and-what-it-doesnt)

---

## 1. What is ishortn.ink?

ishortn.ink is a full-featured **URL shortening and link management platform**. Users paste a long URL and get a short alias (e.g. `ishortn.ink/abc123`). When someone visits the short link, the app:

1. Looks up the alias in the database
2. Records a click event (device, browser, country, city, referrer)
3. Redirects the visitor to the original URL

Beyond basic shortening, the platform also supports:
- Custom domains
- QR code generation
- Geo-targeting and device rules (redirect by country/device)
- Password-protected links
- Campaign link groups
- Team workspaces
- Analytics dashboard (charts, maps, device breakdowns)
- Bio pages (link-in-bio style pages)

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Runtime (local)** | Bun (package manager + script runner) |
| **Runtime (production)** | Cloudflare Workers (via `@opennextjs/cloudflare`) |
| **Database** | MySQL 8.4 (local via Docker; production via PlanetScale or similar) |
| **ORM** | Drizzle ORM + `drizzle-kit` |
| **Database driver** | `mysql2` |
| **Auth** | NextAuth v5 (Auth.js) — credentials + JWT |
| **API** | tRPC v10 + React Query v4 |
| **UI Components** | Radix UI primitives + shadcn/ui patterns |
| **Styling** | Tailwind CSS 3 |
| **Emails** | Resend + React Email |
| **File Storage** | Cloudflare R2 (prod) / MinIO (local dev) |
| **Analytics events** | Cloudflare Queue (prod) / inline (dev) |
| **AI features** | `@ai-sdk/openai` (link suggestions, etc.) |
| **Linting / Format** | oxlint, oxfmt |
| **Tests** | Bun test runner |

---

## 3. Project Structure

```
ishortn.ink/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Sign-in / sign-up pages
│   │   ├── (landing)/          # Public marketing homepage
│   │   ├── (main)/             # Dashboard (authenticated)
│   │   └── api/                # Route handlers (tRPC, auth, queue, cron)
│   ├── auth.config.ts          # Edge-safe NextAuth config (no DB imports)
│   ├── auth.ts                 # Full NextAuth config (DB + bcrypt, Node-only)
│   ├── proxy.ts                # Next.js 16 proxy (replaces middleware.ts)
│   ├── components/             # Shared React components
│   ├── emails/                 # React Email templates
│   ├── env.mjs                 # Typed, validated env vars (t3-oss/env-nextjs)
│   ├── lib/
│   │   ├── core/
│   │   │   ├── analytics/      # Visitor parsing, click event types
│   │   │   ├── cache/          # In-memory link cache (avoids DB on every hit)
│   │   │   └── geo-rules/      # Geo/device targeting rule matching
│   │   ├── billing/            # Plan definitions and limits
│   │   └── logger/             # Pino logger (server-only)
│   ├── middlewares/
│   │   ├── resolve-link.ts     # Main link resolution logic
│   │   ├── record-click.ts     # Cache-first link lookup + click queuing
│   │   └── record-bio-page-view.ts
│   ├── server/
│   │   ├── db/
│   │   │   ├── index.ts        # DB singleton (Node pool or Hyperdrive)
│   │   │   └── schema.ts       # All table definitions (Drizzle)
│   │   ├── api/                # tRPC routers
│   │   └── lib/
│   │       ├── click-queue.ts  # Sends events to Cloudflare Queue (or inline)
│   │       ├── click-ingest.ts # Writes click events to DB with quota + dedup
│   │       └── event-usage.ts  # Monthly event quota management
│   ├── trpc/                   # tRPC client setup
│   └── types/                  # Shared TypeScript types
├── scripts/
│   └── dev/
│       ├── setup.ts            # One-command local setup
│       ├── seed.ts             # Creates sample data
│       ├── webhook.ts          # Simulates Clerk webhooks locally
│       └── cron.ts             # Triggers cron routes locally
├── drizzle/                    # SQL migration files
├── compose.yaml                # Docker Compose (MySQL + MinIO)
├── drizzle.config.ts           # Drizzle Kit config
├── next.config.js              # Next.js config
└── wrangler.jsonc              # Cloudflare Workers config (prod)
```

---

## 4. Local Setup (Step-by-Step)

> **Prerequisites:** Bun and Docker Desktop installed.

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd ishortn.ink
bun install
```

### Step 2 — Run the one-command setup

```bash
bun run setup
```

This script (`scripts/dev/setup.ts`) does the following automatically:

1. Creates `.env` from `.env.example` if it doesn't exist
2. Generates random secrets (`IP_HASH_SECRET`, `VERIFIED_CLICKS_SECRET`, `CRON_SECRET`, `WEBHOOK_SECRET`)
3. Starts MySQL 8.4 via Docker Compose
4. Runs `bun run db:push` to apply the Drizzle schema to the local database
5. Seeds sample data (links, a test user, etc.)

### Step 3 — Start the dev server

```bash
bun run dev
```

App runs at **http://localhost:3000**.

### Step 4 — Sign in locally

The seed script creates a test user. Check `scripts/dev/seed.ts` for the email/password. Alternatively, register a new account via the sign-up page.

---

## 5. Environment Variables

Defined and validated in `src/env.mjs` using `@t3-oss/env-nextjs` + Zod.

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://ishortn:ishortn@localhost:3306/ishortn` |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app, e.g. `http://localhost:3000` |

### Auto-generated by `bun run setup`

| Variable | Description |
|---|---|
| `IP_HASH_SECRET` | HMAC secret for hashing visitor IPs before storage |
| `VERIFIED_CLICKS_SECRET` | Signs tokens used by the verified-click beacon |
| `CRON_SECRET` | Bearer token for protected cron/queue API routes |
| `WEBHOOK_SECRET` | Svix-format secret for webhook simulation |

### Auth

| Variable | Description |
|---|---|
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | JWT signing secret (either name works) |
| `AUTH_URL` / `NEXTAUTH_URL` | Canonical app URL for NextAuth callbacks |

### Optional / Production-only

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Email delivery |
| `R2_*` | Cloudflare R2 object storage (QR code images) |
| `R2_ENDPOINT` | Set this to use local MinIO instead of R2 |
| `OPENAI_API_KEY` | AI link features |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Spam/malware URL checking |
| `CLOUDFLARE_API_TOKEN` | Custom domain provisioning |

---

## 6. Database Schema

The database is **MySQL 8.4** managed by **Drizzle ORM**. All tables are defined in `src/server/db/schema.ts`.

### Core tables

```
User              — accounts (id, email, password hash, plan counters)
Subscription      — billing plan (free/pro/ultra) per user
Link              — shortened URLs (alias, domain, url, settings)
LinkVisit         — one row per click (device, browser, country, city, ...)
UniqueLinkVisit   — one row per (linkId + hashed IP) for unique-click counts
LinkVisitDailySummary — pre-aggregated daily rollups (used when raw rows expire)
```

### Supporting tables

```
Team / TeamMember / TeamInvite  — team workspaces
GeoRule                         — geo/device targeting rules on a link
LinkMilestone                   — click-count milestone notifications
Tag / LinkTag                   — tagging links (many-to-many)
Folder / FolderPermission       — folder organisation with optional access control
CustomDomain                    — user-owned short domains
QrCode / QrPreset               — QR code images and style presets
SiteSettings                    — per-user/team default domain setting
BlockedDomain / FlaggedLink     — admin moderation
Campaign                        — link group campaigns
BioPage / BioPageView           — link-in-bio pages
```

### Key constraints

- `Link` has a `unique(alias, domain)` constraint — the same alias can exist across different domains, but not twice on the same domain.
- `UniqueLinkVisit` has a `unique(linkId, ipHash)` constraint — prevents double-counting unique visitors.
- `LinkVisit.visitId` is unique — this UUID per click deduplicates redelivered Cloudflare Queue messages.

---

## 7. How Link Resolution Works

When someone visits `http://localhost:3000/abc123`:

```
Request: GET /abc123
         ↓
[proxy.ts]  — Next.js 16 proxy (edge-safe, JWT auth only)
         ↓
[app route for /:alias]
         ↓
[resolveShortLink() in src/middlewares/resolve-link.ts]
```

### Inside `resolveShortLink()`

1. **`resolveLink(domain, alias)`** — checks the in-memory cache first. On a cache miss, queries `Link` table by `(domain, alias)`. In `development`, if no match for the specific domain, it falls back to alias-only lookup (so `localhost:3000/abc123` finds a link even if it was created with domain `ishortn.ink`).

2. **Guard checks** — in order:
   - `blocked` → redirect to `/blocked/:id`
   - `disabled` or past expiry date → redirect to `/expired/:id`
   - Over click cap → redirect to `/expired/:id`
   - Scheduled (not yet active) → redirect to `/scheduled/:id`
   - Password-protected → redirect to `/verify-password/:id`

3. **Geo/device targeting** — loads `GeoRule` rows for the link (cached). Uses `ua-parser-js` to detect device/OS from the `User-Agent` header. If a rule matches, the visitor is redirected to the rule's destination or blocked.

4. **UTM parameter injection** — if the link has `utmParams`, they are appended to the destination URL.

5. **Click recording** — calls `recordClick()` which enqueues the event (see §8).

6. **Return** — returns `{ url, cloaking, visitId, verificationToken }`.

### Dev-mode difference

```ts
if (process.env.NODE_ENV === "development") {
  await clickTask.catch((err) => log.error({ err }, "recordClick failed in dev"));
} else {
  void runBackgroundTask(clickTask); // fire-and-forget in prod
}
```

In development, the click is **awaited inline** (synchronous to the redirect). In production, it is fire-and-forget via Cloudflare Queue.

---

## 8. How Click Tracking Works

### The pipeline

```
Visitor hits short URL
      ↓
resolveShortLink() calls recordClick()
      ↓
recordClick()  [src/middlewares/record-click.ts]
  1. Parses User-Agent → device, browser, OS, model
  2. Filters bots (describeVisitor returns null for bots)
  3. Calls enqueueClickEvent()
      ↓
enqueueClickEvent()  [src/server/lib/click-queue.ts]
  PRODUCTION: sends event to Cloudflare Queue → Worker consumer calls ingestClickBatch()
  DEVELOPMENT: calls ingestClickBatch() directly (no queue)
      ↓
ingestClickBatch()  [src/server/lib/click-ingest.ts]
  1. Deduplication: checks if visitId already exists in LinkVisit
  2. Quota enforcement: checks monthly event quota (reserveEventUsage)
  3. Writes to LinkVisit (all clicks)
  4. Writes to UniqueLinkVisit (unique clicks per IP hash)
  5. Fires milestone checks (e.g. "your link hit 100 clicks!")
  6. Sends usage alert emails if quota threshold crossed
```

### What gets stored per click

| Field | Source |
|---|---|
| `device` | `ua-parser-js` — e.g. "Mobile", "Desktop" |
| `browser` | `ua-parser-js` — e.g. "Chrome", "Safari" |
| `os` | `ua-parser-js` — e.g. "Windows", "iOS" |
| `model` | `ua-parser-js` — device model (phones) |
| `referer` | `Referer` HTTP header |
| `country` | Cloudflare `CF-IPCountry` header (prod) / empty string (dev) |
| `city` | Cloudflare geo header (prod) / empty string (dev) |
| `continent` | Cloudflare geo header (prod) / "N/A" (dev) |
| `ipHash` | SHA-256 HMAC of visitor IP (unique click dedup only) |
| `visitId` | UUID generated per click (dedupes queue redeliveries) |
| `createdAt` | Timestamp of the event |

---

## 9. Authentication Architecture

The app uses **NextAuth v5 (Auth.js)** with email + password (bcrypt).

### The split-config pattern

Next.js 16 runs the proxy (`proxy.ts`) in the **Edge runtime**, which cannot use Node.js modules like `mysql2` or `bcrypt`. Auth is therefore split into two files:

| File | Runtime | Imports DB/bcrypt? | Used by |
|---|---|---|---|
| `src/auth.config.ts` | Edge-safe | No | `proxy.ts` (middleware) |
| `src/auth.ts` | Node only | Yes | API routes, server components |

`auth.config.ts` contains:
- Session strategy: JWT
- Sign-in page: `/auth/sign-in`
- JWT / session callbacks
- `authorized()` callback: redirects unauthenticated users away from `/dashboard`

`auth.ts` spreads `authConfig` and **overrides providers** with the full credentials provider that queries the DB and compares bcrypt hashes.

### Session flow

1. User submits email + password to `/auth/sign-in`
2. NextAuth calls `authorize()` in `auth.ts`
3. Queries `User` table, compares bcrypt hash
4. On success, issues a signed JWT stored in a cookie
5. Subsequent requests: `proxy.ts` verifies the JWT (edge-safe, no DB call)

---

## 10. API Layer (tRPC)

All dashboard mutations and queries go through **tRPC v10**.

- Client setup: `src/trpc/`
- Routers: `src/server/api/`
- Entry point: `src/app/api/trpc/[trpc]/route.ts`

tRPC runs on the **Node runtime** (not edge), so it has full access to the database.

React Query is used for client-side caching, optimistic updates, and invalidation.

---

## 11. Why Metrics Look Off in Dev

Several analytics features are intentionally degraded or absent in development.

### Country / City / Continent always empty

Cloudflare sets `CF-IPCountry`, `CF-IPCity`, and `CF-IPContinent` headers on every request in production. When running locally (`next dev`), these headers are absent, so every click is recorded with:

```
country   = ""  (shown as "Unknown")
city      = ""
continent = "N/A"
```

This is expected — not a bug.

### No Cloudflare Queue in dev

In production, clicks are sent to a **Cloudflare Queue** and processed asynchronously by a Worker consumer. Locally, the queue binding doesn't exist, so `enqueueClickEvent()` falls back to calling `ingestClickBatch()` directly:

```ts
const isLocalhost = process.env.NODE_ENV === "development";
// ...
if (queue) {
  await queue.send(event, ...);
} else {
  await ingestClickBatch([event]);  // dev path: writes directly to DB
}
```

Clicks **are** recorded in dev — they just happen inline rather than via a queue.

### Trailing slash on aliases

The `resolveLink()` function strips leading/trailing slashes from the alias:

```ts
const cleanAlias = alias.replace(/^\/+|\/+$/g, "");
```

If a trailing `/` appears in the UI when creating a link, that's a display issue in the form layer, not in the resolver.

### Dev vs Prod comparison

| Feature | Dev | Prod |
|---|---|---|
| Link lookup | Works (alias-only fallback) | Works (domain + alias) |
| Click recorded | Yes (inline) | Yes (via Queue) |
| Country / City | Always empty | From Cloudflare headers |
| Unique clicks | Works | Works |
| Geo targeting | Country always "Unknown" | Works |
| Cloaking | Works | Works |
| Email alerts | Works (if RESEND_API_KEY set) | Works |

---

## 12. Useful Dev Commands

| Command | What it does |
|---|---|
| `bun run setup` | One-command setup: `.env`, Docker, schema push, seed |
| `bun run dev` | Start the Next.js dev server (port 3000) |
| `bun run d` | `setup` + `dev` in one command |
| `bun run db:push` | Apply schema changes to local DB (no migration files) |
| `bun run db:studio` | Open Drizzle Studio (visual DB browser) |
| `bun run db:migrate` | Apply migration files (used for production deploys) |
| `bun run seed` | Re-seed sample data |
| `bun run webhook clerk user.created` | Simulate a Clerk webhook event |
| `bun run cron cleanup-expired` | Trigger a cron route with the CRON_SECRET |
| `bun run email:dev` | Preview email templates at port 3001 |
| `bun run tunnel` | Expose localhost via localtunnel (for webhook testing) |
| `docker compose up -d` | Start MySQL (and MinIO if `--profile storage`) |
| `bun run stack:down` | Stop Docker containers |
| `bun run stack:reset` | Stop + wipe all Docker volumes (fresh DB) |

---

## 13. Docker — What It Does and What It Doesn't

### What Docker provides here

Docker runs **two local infrastructure services** defined in `compose.yaml`:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `db` | `mysql:8.4` | 3306 | Local MySQL database |
| `minio` (optional) | `minio/minio` | 9000, 9001 | S3-compatible file storage (QR images) |

MinIO is only started when you set `R2_ENDPOINT` in your `.env` and launch with `--profile storage`.

### What Docker does NOT do

- Docker does **not** store your production data — it is purely local dev infrastructure.
- Docker does **not** run the Next.js app — you run that yourself with `bun run dev`.
- Docker does **not** affect security or backups — those are handled by the database (MySQL) and cloud storage (R2).

### Cost

Docker Desktop is **free** for individual developers and small teams. There is no cost for running this stack locally.

### If Docker is unavailable

The setup script detects if Docker is not running and skips the compose step with a warning. You can still run the app if you have MySQL running elsewhere — just update `DATABASE_URL` in `.env` to point to your MySQL instance.

---

*Documentation generated: October 2026 · Moladira Skills internal use*
