import { getPlanCaps, type Plan } from "@/lib/billing/plans";
import { type Subscription } from "@/server/db/schema";
import { createTRPCRouter, workspaceProcedure } from "../../trpc";

type PlanCaps = ReturnType<typeof getPlanCaps>;

export type SubscriptionDetailsResponse = {
  plan: Plan;
  caps: PlanCaps;
  canCreateTeam: boolean;
  monthlyLinkCount: number;
  monthlyEventCount: number;
  folderCount: number;
  usage: {
    links: { count: number; limit: number | null };
    events: { count: number; limit: number | null };
    folders: { count: number; limit: number | null };
    domains: { count: number; limit: number | null };
  };
  subscriptions: Subscription | null;
  role: "owner" | "admin" | "member";
};

export const subscriptionsRouter = createTRPCRouter({
  get: workspaceProcedure.query(async (): Promise<SubscriptionDetailsResponse> => {
    const plan: Plan = "ultra";
    const caps = getPlanCaps(plan);

    const dummyUltraSubscription: Subscription = {
      id: 1,
      userId: "",
      plan: "ultra",
      status: "active",
      variantId: 1108002,
      productId: 1108002,
      subscriptionId: null,
      customerId: null,
      orderId: null,
      renewsAt: null,
      endsAt: null,
      billingInterval: "monthly",
      providerUpdatedAt: null,
      cardBrand: null,
      cardLastFour: null,
      createdAt: new Date(),
    };

    return {
      plan,
      caps,
      canCreateTeam: true,
      monthlyLinkCount: 0,
      monthlyEventCount: 0,
      folderCount: 0,
      usage: {
        links: { count: 0, limit: caps.linksLimit ?? null },
        events: { count: 0, limit: caps.eventsLimit ?? null },
        folders: { count: 0, limit: caps.folderLimit ?? null },
        domains: { count: 0, limit: caps.domainLimit ?? null },
      },
      subscriptions: dummyUltraSubscription,
      role: "owner",
    };
  }),
});
