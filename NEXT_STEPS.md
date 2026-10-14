# Self-Hosting & Open-Source Next Steps Roadmap

This document outlines the detailed action plan and implementation steps to replace every external, paid, or cloud-dependent third-party service in the **Marketing Link Generator / iShortn** stack with free, self-hosted, open-source alternatives.

---

## 1. Service Replacement Matrix

| # | Original Cloud Service | Environment Variables | Open-Source Self-Hosted Replacement | Current Integration Status | Primary Benefit |
|---|---|---|---|---|---|
| **1** | **Resend** (Email) | `RESEND_API_KEY` | **Mailpit** (dev) / **Postal** or **Stalwart** (prod) | Needs Nodemailer wrapper | Free local SMTP preview, no API keys, zero rate limits |
| **2** | **Cloudflare R2** (Storage) | `R2_*` | **MinIO** | ✅ **Ready** (supported in `compose.yaml` & `r2.ts`) | S3-compatible, offline file storage for avatars & QR codes |
| **3** | **PostHog Cloud** (Product Analytics) | `NEXT_PUBLIC_POSTHOG_*` | **PostHog Community** or **Umami + DB** | Supported via env vars | Full telemetry privacy, zero data egress to external servers |
| **4** | **Umami Cloud / GA** (Web Analytics) | `UMAMI_*` | **Umami (Self-Hosted)** | ✅ **Ready** (wired in `src/app/layout.tsx`) | Cookie-free, privacy-first page tracking, GDPR compliant |
| **5** | **Google Safe Browsing** (Security) | `GOOGLE_SAFE_BROWSING_API_KEY` | **Local Phishing Scanner / URLhaus** | ✅ **Fail-open built-in** | No external Google Cloud API dependency, runs private |
| **6** | **OpenAI** (Alias & Threat AI) | `OPENAI_API_KEY` | **Ollama** (Local LLM runner) | Supported in `compose.yaml`; minor code swap | 100% offline LLM inference, zero token fees |
| **7** | **Cloudflare for SaaS** (Custom Domains & SSL) | `CLOUDFLARE_*` | **Caddy** with On-Demand TLS | Architecture guide provided | Automatic SSL certificates for arbitrary custom domains |

---

## 2. Detailed Service-by-Service Deep Dive

### Service 1: Email — Resend ➔ Mailpit (Dev) / Postal (Prod)

#### Why Replace?
The app currently depends on Resend to send transactional emails (team invitations, domain expiration notices, milestone celebrations, and account transfers). Resend requires a paid plan or strict verification, and fails during local development if an API key is missing.

#### How It Works:
* **In Development:** [Mailpit](https://github.com/axllent/mailpit) runs as a zero-configuration local SMTP server on port `1025` and provides a web dashboard on port `8025` to inspect all outgoing emails without delivering them to real addresses.
* **In Production:** You can point the same SMTP client to any SMTP provider or self-hosted mail server such as [Postal](https://github.com/postalserver/postal) or [Stalwart](https://github.com/stalwartlabs/mail-server).

#### Code Changes Needed:
Refactor [src/server/lib/notifications/resend-client.ts](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/server/lib/notifications/resend-client.ts) to provide a unified `sendEmail` helper:

```bash
bun add nodemailer @types/nodemailer
```

```typescript
// src/server/lib/notifications/email-client.ts
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/env.mjs";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const smtpTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD ?? "",
          }
        : undefined,
      ignoreTLS: process.env.NODE_ENV !== "production",
    })
  : null;

export async function sendEmail({
  to,
  subject,
  html,
  from = "iShortn <notifications@ishortn.ink>",
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (resend) {
    return await resend.emails.send({ from, to, subject, html });
  }

  if (smtpTransport) {
    return await smtpTransport.sendMail({ from, to, subject, html });
  }

  console.warn("No email transport configured. Message suppressed:", { to, subject });
  return null;
}
```

#### Launch & Configuration:
1. Start Mailpit via Docker:
   ```powershell
   docker compose --profile email up -d
   ```
2. Add to `.env`:
   ```env
   SMTP_HOST="localhost"
   SMTP_PORT=1025
   ```
3. Open Mailpit web inbox at **`http://localhost:8025`**.

---

### Service 2: File Storage — Cloudflare R2 ➔ MinIO

#### Why Replace?
The application stores user profile avatars, QR code center logos, and generated OpenGraph preview banners. Cloudflare R2 is an S3-compatible cloud bucket. [MinIO](https://min.io/) is the industry standard for 100% self-hosted S3 storage.

#### Integration Status:
* [src/server/lib/storage/r2.ts](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/server/lib/storage/r2.ts) uses `@aws-sdk/client-s3` and **already supports custom endpoints** with `forcePathStyle: env.R2_ENDPOINT !== undefined`.
* [compose.yaml](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/compose.yaml#L44-L79) already defines both `minio` and an automated provisioner `minio-init` that initializes the `ishortn-images` bucket with public read permissions.

#### Launch & Configuration:
1. Start MinIO:
   ```powershell
   docker compose --profile storage up -d
   ```
2. Configure `.env`:
   ```env
   R2_ENDPOINT="http://127.0.0.1:9000"
   R2_ACCOUNT_ID="local"
   R2_ACCESS_KEY_ID="ishortn"
   R2_SECRET_ACCESS_KEY="ishortn-secret"
   R2_BUCKET_NAME="ishortn-images"
   R2_PUBLIC_URL="http://127.0.0.1:9000/ishortn-images"
   ```
3. Access MinIO Web Console at **`http://localhost:9001`** (Login: `ishortn` / `ishortn-secret`).

---

### Service 3: Product Analytics — PostHog Cloud ➔ Self-Hosted PostHog / Umami

#### Why Replace?
The app uses PostHog for:
1. Client-side button interactions and user journeys ([src/lib/analytics/events.ts](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/lib/analytics/events.ts)).
2. Embedded traffic dashboards ([src/app/(main)/dashboard/traffic/page.tsx](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/app/(main)/dashboard/traffic/page.tsx)).

Sending analytics to cloud PostHog leaks user engagement data and requires cookie banners.

#### Option A: Self-Hosted PostHog
Deploy PostHog Community on your internal network or VPS:
```bash
git clone https://github.com/PostHog/posthog.git
cd posthog
# Follow PostHog Docker Compose setup instructions
```
Then configure your `.env`:
```env
NEXT_PUBLIC_POSTHOG_KEY="<your-posthog-project-api-key>"
NEXT_PUBLIC_POSTHOG_HOST="http://localhost:8000"
NEXT_PUBLIC_POSTHOG_EMBED_URL="http://localhost:8000/embedded/..."
```

#### Option B: Minimalist (Umami + Built-in Click Tracking)
If your primary need is measuring link clicks and visitor numbers:
* Short link clicks are **already recorded in your local MySQL `clicks` table**.
* Page visits are tracked with **Umami** (Service 4 below).
* You can leave `NEXT_PUBLIC_POSTHOG_KEY` blank; the app safely no-ops without errors.

---

### Service 4: Web Analytics — Google Analytics ➔ Umami

#### Why Replace?
[Umami](https://umami.is) is open-source, cookie-less, lightweight, and GDPR compliant. It gives you real-time visitor stats, referrers, device types, and bounce rates without overhead.

#### Integration Status:
* [src/app/layout.tsx](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/app/layout.tsx#L54-L60) already has the script tag built-in:
  ```tsx
  {env.UMAMI_TRACKING_ID && (
    <Script
      strategy="lazyOnload"
      src={env.UMAMI_URL}
      data-website-id={env.UMAMI_TRACKING_ID}
    />
  )}
  ```
* [compose.yaml](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/compose.yaml#L80-L113) already provides `umami` and `umami-db` (Postgres).

#### Launch & Configuration:
1. Start Umami:
   ```powershell
   docker compose --profile analytics up -d
   ```
2. Log into the Umami dashboard at **`http://localhost:3002`** (Default: `admin` / `umami`).
3. Navigate to **Settings** ➔ **Websites** ➔ **Add Website**.
4. Enter your app name and domain, then copy the **Website ID** (UUID).
5. Update `.env`:
   ```env
   UMAMI_URL="http://localhost:3002/script.js"
   UMAMI_TRACKING_ID="<your-website-uuid>"
   ```
6. Restart the app. Live visitors will appear on your Umami dashboard.

---

### Service 5: Threat Detection — Google Safe Browsing ➔ Fail-Open / URLhaus

#### Why Replace?
Google Safe Browsing API requires a paid Google Cloud account with active billing and sends outbound HTTP requests to Google for every submitted shortlink.

#### Current Architecture:
* In [src/server/lib/phishing/google-safe-browsing.ts](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/server/lib/phishing/google-safe-browsing.ts#L20-L22), the function immediately returns `{ status: "error" }` if `GOOGLE_SAFE_BROWSING_API_KEY` is undefined.
* The link validation pipeline treats this as a graceful non-blocking fail-open.
* For a fully self-hosted security layer, you can query the public [URLhaus](https://urlhaus.abuse.ch/api/) API (free, open intelligence) or rely on our local AI Phishing detector powered by Ollama.

---

### Service 6: AI Features — OpenAI ➔ Ollama

#### Why Replace?
The app calls OpenAI in [src/server/api/routers/ai/ai.service.ts](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/server/api/routers/ai/ai.service.ts) for:
1. Generating catchy, memorable alias recommendations from page metadata.
2. Heuristic phishing link detection.

Using OpenAI requires paying for token usage and sends user URLs to third-party model providers.

#### How It Works:
[Ollama](https://ollama.com/) runs LLMs locally on CPU or GPU inside a Docker container. Ollama provides an OpenAI-compatible API endpoint at `http://localhost:11434/v1`.

#### Launch & Configuration:
1. Start Ollama container:
   ```powershell
   docker compose --profile ai up -d
   ```
2. Pull a lightweight model (e.g., `llama3.2` or `mistral`):
   ```powershell
   docker exec -it ishortn-ollama-1 ollama pull llama3.2
   ```
3. Update [src/server/api/routers/ai/ai.service.ts](file:///c:/Users/USER/Downloads/Marketing_Link_Gen/src/server/api/routers/ai/ai.service.ts) to switch providers based on environment:

```typescript
import { createOpenAI } from "@ai-sdk/openai";

// If OPENAI_API_KEY is present, use official OpenAI.
// Otherwise, route to local Ollama via its OpenAI-compatible endpoint:
const modelClient = process.env.OPENAI_API_KEY
  ? createOpenAI()
  : createOpenAI({
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: "ollama", // Required by SDK, ignored by Ollama
    });

const aiModel = process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "llama3.2";

export async function generateAliasFromMetadata(...) {
  const result = await generateText({
    model: modelClient(aiModel),
    // ...
  });
}
```

---

### Service 7: Custom Domains & SSL — Cloudflare for SaaS ➔ Caddy On-Demand TLS

#### Why Replace?
In SaaS mode, custom domains (e.g. `links.mybrand.com` pointing to your service) rely on Cloudflare for SaaS custom hostnames. Cloudflare for SaaS requires Enterprise or paid plans with per-hostname fees.

#### The Open-Source Alternative: Caddy
[Caddy](https://caddyserver.com/) is an open-source web server with native **On-Demand TLS**. When a user points their Caddy CNAME or A-record to your server, Caddy dynamically obtains a Let's Encrypt SSL certificate during the initial TLS handshake without needing Cloudflare!

#### Caddy Configuration (`Caddyfile`):
```caddy
{
    on_demand_tls {
        # Verifies the domain is registered in iShortn before issuing cert
        ask http://localhost:3000/api/domains/verify-ownership
    }
}

# Matches any custom domain pointing to your server
https:// {
    tls {
        on_demand
    }
    reverse_proxy localhost:3000
}
```
* **Security Guard:** The `ask` endpoint prevents DDoS certificate exhaustion attacks by ensuring only domains registered in your MySQL database receive certificates.

---

## 3. Step-by-Step Execution Plan

### Step 1: Start All Self-Hosted Containers
Run the complete stack locally using Docker Compose profiles:
```powershell
docker compose --profile email --profile storage --profile analytics --profile ai up -d
```

Verify all containers are healthy:
```powershell
docker compose ps
```

### Step 2: Update Your `.env` File
Ensure your `.env` contains the self-hosted endpoints:
```env
# ── Database ──
DATABASE_URL="mysql://ishortn:ishortn@127.0.0.1:3306/ishortn"

# ── Email (Mailpit) ──
SMTP_HOST="localhost"
SMTP_PORT=1025

# ── Storage (MinIO) ──
R2_ENDPOINT="http://127.0.0.1:9000"
R2_ACCOUNT_ID="local"
R2_ACCESS_KEY_ID="ishortn"
R2_SECRET_ACCESS_KEY="ishortn-secret"
R2_BUCKET_NAME="ishortn-images"
R2_PUBLIC_URL="http://127.0.0.1:9000/ishortn-images"

# ── Analytics (Umami) ──
UMAMI_URL="http://localhost:3002/script.js"
UMAMI_TRACKING_ID="<your-website-id>"

# ── AI (Ollama) ──
OLLAMA_BASE_URL="http://localhost:11434/v1"
```

### Step 3: Pull the AI Model
```powershell
docker exec -it ishortn-ollama-1 ollama pull llama3.2
```

### Step 4: Verification Checklist
- [ ] **Database:** Run `bun run db:studio` ➔ access `http://localhost:4983`
- [ ] **Web App:** Run `bun run dev` ➔ access `http://localhost:3000`
- [ ] **Email Inbox:** Open `http://localhost:8025` ➔ send a test invite
- [ ] **Storage Console:** Open `http://localhost:9001` ➔ confirm `ishortn-images` bucket exists
- [ ] **Analytics:** Open `http://localhost:3002` ➔ verify live visitors
- [ ] **AI Alias Generator:** Create a new link and test the AI alias suggestion button
