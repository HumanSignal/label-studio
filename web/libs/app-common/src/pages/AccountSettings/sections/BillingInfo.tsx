import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { useToast } from "@humansignal/ui";
import styles from "./BillingInfo.module.scss";

type BillingInterval = "monthly" | "yearly";
type BillingPlan = "free" | "standard" | "pro" | "enterprise";

interface BillingStatus {
  plan: BillingPlan;
  limits: {
    max_projects: number | null;
    max_tasks: number | null;
  };
  usage: {
    projects_count: number;
    tasks_count: number;
  };
  subscription?: {
    plan?: BillingPlan;
    interval?: BillingInterval;
    subscription_id: string | null;
    status: string | null;
    current_period_end: string | null;
  };
}

export const BillingInfo = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { data: billingStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const response = await API.invoke("billingStatus");
      if (!response.$meta.ok) {
        throw new Error("Failed to fetch billing status");
      }
      return response as BillingStatus;
    },
  });

  const handleViewPlans = () => {
    if (!window?.location) return;
    window.location.href = "/billing";
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await API.invoke("createPortal");
      if (!response.$meta.ok) {
        throw new Error(response.error || "Failed to create portal session");
      }

      // Redirect to Stripe Customer Portal
      window.location.href = response.portal_url;
    } catch (error) {
      console.error("Failed to create portal session:", error);
      toast({
        title: "Error",
        description: "Failed to access billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLimit = (value: number | null): string => {
    return value === null ? "Unlimited" : value.toString();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getPlanDisplayName = (plan: string): string => {
    if (plan === "standard") return "Standard";
    if (plan === "pro") return "Pro";
    if (plan === "enterprise") return "Enterprise";
    return "Free";
  };

  const getSubscriptionStatus = (status?: string): string => {
    if (!status) return "N/A";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoadingStatus) {
    return (
      <div className={styles.billingInfo}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading billing information...</div>
        </div>
      </div>
    );
  }

  if (!billingStatus) {
    return (
      <div className={styles.billingInfo}>
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Unable to load billing information</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.billingInfo}>
      {/* Current Plan */}
      <div className="flex gap-2 w-full justify-between items-center mb-4">
        <div className="text-lg font-semibold">Current Plan</div>
        <div className="text-lg font-bold text-primary">
          {getPlanDisplayName(billingStatus.plan)}
        </div>
      </div>

      {/* Subscription Status (paid plans) */}
      {(billingStatus.plan === "standard" || billingStatus.plan === "pro") && billingStatus.subscription && (
        <div className="flex gap-2 w-full justify-between mb-4">
          <div>Subscription Status</div>
          <div>{getSubscriptionStatus(billingStatus.subscription.status)}</div>
        </div>
      )}

      {/* Limits */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Plan Limits</h3>
        <div className="space-y-2">
          <div className="flex gap-2 w-full justify-between">
            <div>Projects</div>
            <div>{formatLimit(billingStatus.limits.max_projects)}</div>
          </div>
          <div className="flex gap-2 w-full justify-between">
            <div>Tasks</div>
            <div>{formatLimit(billingStatus.limits.max_tasks)}</div>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Current Usage</h3>
        <div className="space-y-2">
          <div className="flex gap-2 w-full justify-between">
            <div>Projects</div>
            <div>{billingStatus.usage.projects_count}</div>
          </div>
          <div className="flex gap-2 w-full justify-between">
            <div>Tasks</div>
            <div>{billingStatus.usage.tasks_count}</div>
          </div>
        </div>
      </div>

      {/* Subscription Details (paid plans) */}
      {(billingStatus.plan === "standard" || billingStatus.plan === "pro") && billingStatus.subscription && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Subscription Details</h3>
          <div className="space-y-2">
            <div className="flex gap-2 w-full justify-between">
              <div>Next Billing Date</div>
              <div>{formatDate(billingStatus.subscription.current_period_end)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        {billingStatus.plan === "free" ? (
          <button onClick={handleViewPlans} disabled={isLoading} className={styles.upgradeButton} type="button">
            View Plans
          </button>
        ) : billingStatus.plan === "standard" || billingStatus.plan === "pro" ? (
          <button
            onClick={handleManageBilling}
            disabled={isLoading}
            className={styles.manageButton}
            type="button"
          >
            {isLoading ? "Loading..." : "Manage Billing"}
          </button>
        ) : (
          <button onClick={handleViewPlans} disabled={isLoading} className={styles.manageButton} type="button">
            View Plans
          </button>
        )}
      </div>
    </div>
  );
};




