import { atomWithQuery } from "jotai-tanstack-query";
import { API } from "../providers/ApiProvider";

export type PlanTier = "free" | "standard" | "pro";

export interface BillingStatusResponse {
  plan: PlanTier;
  limits: {
    max_projects: number | null;
    max_tasks: number | null;
  };
  usage: {
    projects_count: number;
    tasks_count: number;
  };
  subscription: {
    plan: PlanTier;
    subscription_id: string | null;
    status: string | null;
    current_period_end: string | null;
  } | null;
  stripe_customer_id?: string | null;
}

export const billingStatusAtom = atomWithQuery(() => ({
  queryKey: ["billing-status"],
  staleTime: 0, // Always refetch when invalidated to keep badge in sync
  gcTime: 0, // Don't cache to ensure fresh data
  refetchOnMount: true, // Always refetch when component mounts
  refetchOnWindowFocus: true, // Refetch when window regains focus
  async queryFn(): Promise<BillingStatusResponse> {
    return await API.invoke("billingStatus");
  },
}));





