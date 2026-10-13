import { IconCheck, IconCrown, IconSparkles } from "@tabler/icons-react";
import { Link } from "next-view-transitions";

export const dynamic = "force-dynamic";

const ULTRA_CAPABILITIES = [
  {
    title: "Unlimited Links & Redirects",
    desc: "Shorten and manage links without any monthly quotas or rate gates.",
  },
  {
    title: "Custom Domain Routing",
    desc: "Attach your brand's company domains and subdomains effortlessly.",
  },
  {
    title: "Deep Targeting Rules",
    desc: "Route visitors by country, operating system, and device type dynamically.",
  },
  {
    title: "Bio Link Builder",
    desc: "Design and publish custom link-in-bio hub pages for marketing campaigns.",
  },
  {
    title: "Team Workspaces",
    desc: "Collaborate with colleagues and manage shared links across your team.",
  },
  {
    title: "Complete Analytics History",
    desc: "Inspect clicks, referrers, locations, and browser stats with no date restrictions.",
  },
];

export default function PricingPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-3">
          <IconCrown size={14} />
          <span>Internal Organization Plan</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-foreground">
          Ultra Plan Active
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
          Your local instance is pre-configured with full Ultra access for all team members. No external subscription, payment, or license key is required.
        </p>
      </div>

      <div className="rounded-3xl border border-neutral-200 dark:border-border p-8 bg-white dark:bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-neutral-900 dark:text-foreground">
                Ultra License
              </span>
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Active &bull; Unlimited
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Self-hosted and managed entirely within your company infrastructure
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-foreground px-4 py-2.5 text-sm font-medium text-white dark:text-background hover:bg-neutral-800 transition-colors"
          >
            <IconSparkles size={16} />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {ULTRA_CAPABILITIES.map((cap) => (
            <div key={cap.title} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <IconCheck size={16} className="text-emerald-500 shrink-0" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-foreground">
                  {cap.title}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 pl-6">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
