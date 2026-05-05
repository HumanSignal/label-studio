import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@humansignal/ui/lib/card-new/card";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { useToast } from "@humansignal/ui";
import { useSetAtom } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import styles from "./BillingPage.module.scss";

const STRIPE_PRICING_TABLE_SCRIPT_SRC = "https://js.stripe.com/v3/pricing-table.js";

const loadStripePricingTableScript = () => {
  if (typeof document === "undefined") return;

  const existing = document.querySelector(`script[src="${STRIPE_PRICING_TABLE_SCRIPT_SRC}"]`);
  if (existing) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = STRIPE_PRICING_TABLE_SCRIPT_SRC;
  document.body.appendChild(script);
};

export const BillingPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const setQueryClient = useSetAtom(queryClientAtom);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const billingConfig = useMemo(() => {
    const billing = window.APP_SETTINGS?.billing;
    return {
      pricingTableId: billing?.pricing_table_id ?? null,
      publishableKey: billing?.stripe_publishable_key ?? null,
      clientReferenceId: billing?.client_reference_id ?? null,
      customerEmail: billing?.customer_email ?? null,
    };
  }, []);

  // Fetch current billing status
  const { data: billingStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const response = await API.invoke("billingStatus");
      if (!response.$meta.ok) throw new Error("Failed to fetch billing status");
      return response;
    },
  });

  useEffect(() => {
    loadStripePricingTableScript();
  }, []);

  const handleRestorePurchase = async () => {
    setIsSyncing(true);
    try {
      const response = await API.invoke("syncBillingStatus");
      
      if (!response.$meta.ok) {
        throw new Error(response.error || "Failed to sync billing status");
      }

      // Invalidate and refetch billing status to update both the page and the badge
      // Ensure jotai atoms also get the updated queryClient
      setQueryClient(queryClient);
      
      // Force refetch to ensure all components using this query key get updated
      await queryClient.invalidateQueries({ queryKey: ["billing-status"], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ["billing-status"], type: 'active' });

      if (toast) {
        toast.show({
          message: "Subscription status has been restored from Stripe.",
          type: "success",
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to restore purchase:", error);
      if (toast) {
        toast.show({
          message: error instanceof Error ? error.message : "Failed to restore purchase. Please try again.",
          type: "error",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const response = await API.invoke("createPortal");
      if (!response.$meta.ok) {
        throw new Error(response.error || "Failed to open billing portal");
      }

      if (!response.portal_url) {
        throw new Error("Billing portal URL was not returned");
      }

      window.location.href = response.portal_url;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to open billing portal:", error);
      toast?.show({
        message: error instanceof Error ? error.message : "Failed to open billing portal. Please try again.",
        type: "error",
      });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const isPro = billingStatus?.plan === "pro";

  return (
    <div className={styles.billingPage}>
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>Manage your subscription and pricing.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Plan Status */}
          {!isLoadingStatus && billingStatus && (
            <div className={styles.statusSection}>
              <div className={styles.statusRow}>
                <span className={styles.statusLabel}>Current Plan:</span>
                <span className={styles.statusValue}>
                  {billingStatus.plan === "free"
                    ? "Free"
                    : billingStatus.plan === "standard"
                      ? "Standard"
                      : billingStatus.plan === "pro"
                        ? "Pro"
                        : "Enterprise"}
                </span>
              </div>
              {billingStatus.subscription?.status && (
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Status:</span>
                  <span className={styles.statusValue}>
                    {billingStatus.subscription.status.charAt(0).toUpperCase() +
                      billingStatus.subscription.status.slice(1)}
                  </span>
                </div>
              )}
              {isPro && (
                <div className={styles.proHint}>
                  Your organization is already on Pro. Use the billing portal to manage or cancel your subscription.
                </div>
              )}

              <div className={styles.statusActions}>
                {isPro && (
                  <button
                    type="button"
                    onClick={handleOpenBillingPortal}
                    disabled={isOpeningPortal}
                    className={styles.secondaryButton}
                  >
                    {isOpeningPortal ? "Opening Portal..." : "Manage / Cancel Subscription"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRestorePurchase}
                  disabled={isSyncing}
                  className={styles.restoreButton}
                >
                  {isSyncing ? "Syncing..." : "Restore Purchase"}
                </button>
              </div>
              <div className={styles.restoreHint}>
                If your subscription status seems incorrect, click "Restore Purchase" to sync from Stripe.
              </div>
            </div>
          )}

          {/* Stripe Pricing Table */}
          {isPro ? null : (
            !billingConfig.pricingTableId || !billingConfig.publishableKey ? (
              <div className={styles.loading}>
                Stripe Pricing Table is not configured. Set <code>STRIPE_PRICING_TABLE_ID</code> and{" "}
                <code>STRIPE_TEST_PUBLISHABLE_KEY</code>/<code>STRIPE_LIVE_PUBLISHABLE_KEY</code>.
              </div>
            ) : (
              <div className={styles.pricingTableWrapper}>
                <stripe-pricing-table
                  pricing-table-id={billingConfig.pricingTableId}
                  publishable-key={billingConfig.publishableKey}
                  client-reference-id={billingConfig.clientReferenceId ?? undefined}
                  customer-email={billingConfig.customerEmail ?? undefined}
                  customer={billingStatus?.stripe_customer_id ?? undefined}
                />
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

BillingPage.title = "Billing";
BillingPage.path = "/billing";
BillingPage.exact = true;




