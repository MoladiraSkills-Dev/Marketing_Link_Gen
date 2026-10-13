"use client";

import { IconCheck, IconSparkles } from "@tabler/icons-react";

import type { RouterOutputs } from "@/trpc/shared";

type BillingProps = {
  subscriptions: RouterOutputs["subscriptions"]["get"];
};

const UNLOCKED_FEATURES = [
  "Unlimited links & clicks",
  "Unlimited custom branded domains",
  "Unlimited bio link pages",
  "Unlimited campaigns & UTM templates",
  "Full geo, device & OS targeting rules",
  "Team workspaces & collaboration",
  "Full history analytics with no date limits",
];

export default function Billing({ subscriptions }: BillingProps) {
  const currentPlan = subscriptions?.plan ?? "ultra";

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 dark:border-border p-6 bg-white dark:bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold capitalize text-neutral-900 dark:text-foreground">
              {currentPlan} Plan
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active &bull; Unlimited
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
            Internal organization deployment. All premium features are unlocked with zero usage limits.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-accent/60 px-3 py-1.5 rounded-lg w-fit">
          <IconSparkles size={15} className="text-amber-500" />
          <span>Full Internal Access</span>
        </div>
      </div>

      <div className="border-t border-neutral-100 dark:border-border/60 pt-5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
          Included with your instance
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {UNLOCKED_FEATURES.map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
              <IconCheck size={16} className="text-emerald-500 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
