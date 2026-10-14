# ishortn.ink — DB Visibility Issue & Self-Hosting Guide

---

## Part 1: Why Drizzle Studio Shows No Data

### The data IS there

Running a direct MySQL query confirms the database is healthy and has real data:

```
Users:  2  (fibregems@gmail.com, mukonamusia@gmail.com)
Links:  2  (moladiraskills.co.za/3LgnISkjw, fibregems.com/b8SjEmht6)
Visits: 1  (United States / Desktop / Chrome)
```

The Docker container `ishortn-db-1` is **Up and healthy** on port 3306.

### Root cause: `tablesFilter` mismatch in drizzle.config.ts

Open [`drizzle.config.ts`](file:///c:/Users/User/Downloads/iShrt_Link/ishortn.ink/drizzle.config.ts):

```ts
tablesFilter: [`${DATABASE_PREFIX}_*`],
```

And [`src/lib/constants/app.ts`](file:///c:/Users/User/Downloads/iShrt_Link/ishortn.ink/src/lib/constants/app.ts):

```ts
export const DATABASE_PREFIX = "acme";
```

So Drizzle Kit is filtering for tables named **`acme_*`**. But your actual table names are `User`, `Link`, `LinkVisit`, etc. — **no prefix at all**. Drizzle Studio finds zero tables matching `acme_*` and shows nothing.

### Fix

Edit [`drizzle.config.ts`](file:///c:/Users/User/Downloads/iShrt_Link/ishortn.ink/drizzle.config.ts) and remove the `tablesFilter` line entirely:

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Remove the tablesFilter line — your tables have no prefix
});
```

Then restart Drizzle Studio:

```bash
bun run db:studio
```

All tables will now appear.

---

> [!NOTE]
> The `DATABASE_PREFIX = "acme"` constant is a leftover from the project template. It is not used by the app itself (only by drizzle-kit config), so removing `tablesFilter` has no effect on the running application.

---

## Part 2: Self-Hosting Everything with Docker

### Goal

Replace every paid/external third-party API with a free, open-source, Docker-hosted alternative — so the entire stack runs offline on a developer laptop or a self-managed server.

### Replacement Map

| Original Service | Variable | Open-Source Alternative | Docker Image |
|---|---|---|---|
| Resend (email) | `RESEND_API_KEY` | **Mailpit** (dev preview) or **Postal** (prod SMTP) | `axllent/mailpit` |
| Cloudflare R2 (storage) | `R2_*` | **MinIO** ✅ already in compose.yaml | `minio/minio` |
| PostHog (product analytics) | `NEXT_PUBLIC_POSTHOG_*` | **PostHog Community** (self-hosted) | `posthog/posthog` |
| Umami (page analytics) | `UMAMI_*` | **Umami** ✅ already supported, just needs a server | `ghcr.io/umami-software/umami` |
| Google Safe Browsing | `GOOGLE_SAFE_BROWSING_API_KEY` | Skip — app already fail-opens gracefully | — |
| OpenAI | `OPENAI_API_KEY` | **Ollama** (local LLM runner) | `ollama/ollama` |
| Cloudflare for SaaS | `CLOUDFLARE_*` | Not replaceable for production SSL — skip for internal use | — |

---

### Extended `compose.yaml`

Replace your current [`compose.yaml`](file:///c:/Users/User/Downloads/iShrt_Link/ishortn.ink/compose.yaml) with this version that adds Mailpit, MinIO (storage), Umami, and Ollama:

```yaml
name: ishortn

services:

  # ─── Database ────────────────────────────────────────────────────────────────
  db:
    image: mysql:8.4
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: ishortn
      MYSQL_USER: ishortn
      MYSQL_PASSWORD: ishortn
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-uroot", "-proot"]
      interval: 2s
      timeout: 5s
      retries: 30
      start_period: 10s

  # ─── Email: Mailpit (dev inbox — catches all outgoing emails) ─────────────────
  # Open http://localhost:8025 to see every email the app tries to send.
  # No real email is delivered — safe for dev.
  mailpit:
    image: axllent/mailpit:latest
    profiles: [email]
    ports:
      - "${MAILPIT_SMTP_PORT:-1025}:1025"   # SMTP (app sends here)
      - "${MAILPIT_UI_PORT:-8025}:8025"     # Web UI (you view emails here)
    environment:
      MP_MAX_MESSAGES: 500
    restart: unless-stopped

  # ─── Storage: MinIO (S3-compatible — for QR logos, bio avatars, OG images) ───
  minio:
    image: minio/minio:latest
    profiles: [storage]
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ishortn
      MINIO_ROOT_PASSWORD: ishortn-secret
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 2s
      timeout: 5s
      retries: 30

  minio-init:
    image: minio/mc:latest
    profiles: [storage]
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 ishortn ishortn-secret &&
        mc mb --ignore-existing local/ishortn-images &&
        mc anonymous set download local/ishortn-images
      "

  # ─── Analytics: Umami (self-hosted page-view analytics) ──────────────────────
  # Open http://localhost:3002 — default login: admin / umami
  # Create a website, copy the tracking ID into UMAMI_TRACKING_ID
  umami-db:
    image: postgres:15-alpine
    profiles: [analytics]
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami
    volumes:
      - umami_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U umami"]
      interval: 5s
      timeout: 5s
      retries: 5

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    profiles: [analytics]
    ports:
      - "${UMAMI_PORT:-3002}:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami@umami-db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: changeme-umami-secret
    depends_on:
      umami-db:
        condition: service_healthy
    restart: unless-stopped

  # ─── AI: Ollama (local LLM — replaces OpenAI for alias suggestions) ──────────
  # Models are pulled on first use. Start with: docker compose --profile ai up -d
  # Then pull a model: docker exec ishortn-ollama-1 ollama pull llama3.2
  ollama:
    image: ollama/ollama:latest
    profiles: [ai]
    ports:
      - "${OLLAMA_PORT:-11434}:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

volumes:
  db_data:
  minio_data:
  umami_db_data:
  ollama_data:
```

---

### Updated `.env` additions

Add these to your `.env` when starting the corresponding profiles:

```env
# ─── Email (Mailpit) ──────────────────────────────────────────────────────────
# Tell the app to send via Mailpit's SMTP instead of Resend.
# (Requires wiring Resend → Nodemailer in the app — see note below)
SMTP_HOST=localhost
SMTP_PORT=1025

# ─── Storage (MinIO) ──────────────────────────────────────────────────────────
R2_ENDPOINT='http://127.0.0.1:9000'
R2_ACCOUNT_ID='local'
R2_ACCESS_KEY_ID='ishortn'
R2_SECRET_ACCESS_KEY='ishortn-secret'
R2_BUCKET_NAME='ishortn-images'
R2_PUBLIC_URL='http://127.0.0.1:9000/ishortn-images'

# ─── Analytics (Umami) ────────────────────────────────────────────────────────
UMAMI_URL='http://localhost:3002'
UMAMI_TRACKING_ID='<paste-from-umami-dashboard>'

# ─── AI (Ollama) ──────────────────────────────────────────────────────────────
# After swapping OpenAI provider — see note below
OLLAMA_BASE_URL='http://localhost:11434'
```

---

### How to start each profile

```bash
# Core (DB only — always needed)
docker compose up -d

# + Email inbox
docker compose --profile email up -d

# + File storage (QR logos, bio avatars)
docker compose --profile storage up -d

# + Analytics
docker compose --profile analytics up -d

# + AI
docker compose --profile ai up -d

# Everything at once
docker compose --profile email --profile storage --profile analytics --profile ai up -d
```

---

### What needs changing in the app code

#### 1. Email: Resend → SMTP (Mailpit / any SMTP server)

The app currently uses the Resend SDK directly. To support self-hosted SMTP, swap `resend-client.ts` to use **Nodemailer** with SMTP when `RESEND_API_KEY` is not set:

```ts
// src/server/lib/notifications/email-client.ts
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/env.mjs";

// Use Resend if API key is set (production)
// Fall back to local SMTP/Mailpit (dev / self-hosted)
export function getEmailTransport() {
  if (env.RESEND_API_KEY) {
    return new Resend(env.RESEND_API_KEY);
  }
  // Nodemailer SMTP (Mailpit, Postal, any SMTP server)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    ignoreTLS: true,
  });
}
```

> **Install:** `bun add nodemailer @types/nodemailer`

#### 2. AI: OpenAI → Ollama

The app uses `@ai-sdk/openai`. The AI SDK also has an Ollama provider:

```bash
bun add ollama-ai-provider
```

Then in wherever the AI features are called, check for `OPENAI_API_KEY` and fall back to Ollama:

```ts
import { openai } from "@ai-sdk/openai";
import { ollama } from "ollama-ai-provider";

const model = process.env.OPENAI_API_KEY
  ? openai("gpt-4o-mini")
  : ollama("llama3.2"); // pulled via: docker exec ishortn-ollama-1 ollama pull llama3.2
```

#### 3. Storage: MinIO is already supported ✅

The app already reads `R2_ENDPOINT` and routes to MinIO automatically. Just uncomment the `R2_*` lines in `.env` (shown above) and run `docker compose --profile storage up -d`.

#### 4. Analytics: Umami is already supported ✅

The app already has `UMAMI_TRACKING_ID` + `UMAMI_URL` env vars wired in. Run the analytics profile, create a website in the Umami UI at `http://localhost:3002`, and paste the tracking ID.

---

### Access URLs (once running)

| Service | URL | Credentials |
|---|---|---|
| **App** | http://localhost:3000 | Your dev account |
| **Drizzle Studio** (DB browser) | http://localhost:4983 | — |
| **Mailpit** (email inbox) | http://localhost:8025 | — |
| **MinIO console** (file storage) | http://localhost:9001 | ishortn / ishortn-secret |
| **Umami** (analytics) | http://localhost:3002 | admin / umami |
| **Ollama** (AI API) | http://localhost:11434 | — |

---

### Hosting on a server (team-shared instance)

To host for the whole team on a VPS or internal server:

1. **Reverse proxy**: Use [Caddy](https://caddyserver.com/) or Nginx to map subdomains to each service port.
2. **Caddy example** (auto-HTTPS, completely free):

```
app.yourserver.co.za {
  reverse_proxy localhost:3000
}
studio.yourserver.co.za {
  reverse_proxy localhost:4983
}
mail.yourserver.co.za {
  reverse_proxy localhost:8025
}
storage.yourserver.co.za {
  reverse_proxy localhost:9001
}
analytics.yourserver.co.za {
  reverse_proxy localhost:3002
}
```

3. **Run the stack headlessly**:
```bash
docker compose --profile email --profile storage --profile analytics up -d
```

4. **Set `NEXT_PUBLIC_APP_URL`** to your public server domain.
5. **Use `bun run build && bun run start`** (or keep `bun run dev` for internal-only).

---

### Cost of the full self-hosted stack

| Item | Cost |
|---|---|
| Docker (local) | R0 |
| MySQL (Docker) | R0 |
| MinIO (Docker) | R0 |
| Mailpit (Docker) | R0 |
| Umami (Docker) | R0 |
| Ollama (Docker) | R0 |
| VPS to host for the team | ~R150–R300/month (Hetzner CX22 or similar) |
| **Total for local dev** | **R0** |
| **Total for team server** | **~R150–R300/month** |
