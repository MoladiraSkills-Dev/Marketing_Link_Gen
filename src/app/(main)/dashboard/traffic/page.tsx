import type { Metadata } from "next";

import { env } from "@/env.mjs";

export const metadata: Metadata = {
  title: "Web Traffic – iShortn",
  description: "Live web traffic analytics powered by PostHog.",
};

export default function TrafficPage() {
  const embedUrl = env.NEXT_PUBLIC_POSTHOG_EMBED_URL;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-foreground">
          Web Traffic
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Live analytics for all your CRMs, powered by PostHog.
        </p>
      </div>

      {/* Dashboard content */}
      {embedUrl ? (
        <div className="flex-1 overflow-hidden rounded-xl border border-neutral-200 dark:border-border shadow-sm">
          <iframe
            src={embedUrl}
            title="PostHog Analytics Dashboard"
            className="h-full min-h-[600px] w-full"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-neutral-200 dark:border-border p-12 text-center">
      {/* Icon */}
      <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-500/10">
        <svg
          className="size-8 text-violet-600 dark:text-violet-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
      </div>

      {/* Copy */}
      <div className="max-w-sm space-y-2">
        <p className="text-base font-semibold text-neutral-900 dark:text-foreground">
          Connect PostHog to see traffic
        </p>
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          Set up PostHog (self-hosted or cloud) and paste your shared dashboard
          URL into <code className="rounded bg-neutral-100 dark:bg-muted px-1 py-0.5 text-xs font-mono">NEXT_PUBLIC_POSTHOG_EMBED_URL</code> to
          embed live web traffic across all your CRMs here.
        </p>
      </div>

      {/* Steps */}
      <ol className="mt-2 w-full max-w-md space-y-3 text-left">
        {[
          {
            step: "1",
            title: "Deploy self-hosted PostHog",
            body: (
              <>
                Run{" "}
                <code className="rounded bg-neutral-100 dark:bg-muted px-1 py-0.5 text-xs font-mono">
                  git clone https://github.com/PostHog/posthog.git
                </code>{" "}
                and follow the Docker Compose quick-start.
              </>
            ),
          },
          {
            step: "2",
            title: "Configure your project key",
            body: (
              <>
                Add{" "}
                <code className="rounded bg-neutral-100 dark:bg-muted px-1 py-0.5 text-xs font-mono">
                  NEXT_PUBLIC_POSTHOG_KEY
                </code>{" "}
                and{" "}
                <code className="rounded bg-neutral-100 dark:bg-muted px-1 py-0.5 text-xs font-mono">
                  NEXT_PUBLIC_POSTHOG_HOST
                </code>{" "}
                to your <code className="rounded bg-neutral-100 dark:bg-muted px-1 py-0.5 text-xs font-mono">.env</code> file.
              </>
            ),
          },
          {
            step: "3",
            title: "Share a dashboard",
            body: "In PostHog, open any dashboard → Share → Enable public link → copy the embed URL.",
          },
          {
            step: "4",
            title: "Paste the embed URL",
            body: (
              <>
                Set{" "}
                <code className="rounded bg-neutral-100 dark:bg-muted px-1 py-0.5 text-xs font-mono">
                  NEXT_PUBLIC_POSTHOG_EMBED_URL=https://your-posthog/embedded/...
                </code>{" "}
                and restart the dev server.
              </>
            ),
          },
        ].map(({ step, title, body }) => (
          <li
            key={step}
            className="flex gap-3 rounded-lg border border-neutral-100 dark:border-border bg-neutral-50 dark:bg-accent/20 px-4 py-3"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              {step}
            </span>
            <div className="text-[13px] text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-foreground">
                {title}.
              </span>{" "}
              {body}
            </div>
          </li>
        ))}
      </ol>

      {/* CTA */}
      <a
        href="https://posthog.com/docs/self-host"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
      >
        <svg
          className="size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
        PostHog Self-host Docs
      </a>
    </div>
  );
}
