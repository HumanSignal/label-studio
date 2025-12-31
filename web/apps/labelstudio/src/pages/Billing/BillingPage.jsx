import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAPI } from "../../providers/ApiProvider";
import { useCurrentUser } from "../../providers/CurrentUser";
import { Block, Elem } from "../../utils/bem";
import { PricingTable } from "./PricingTable";
import { SubscriptionStatus } from "./SubscriptionStatus";
import "./BillingPage.scss";

export const BillingPage = () => {
  const api = useAPI();
  const { user } = useCurrentUser();
  const sessionRefreshTimerRef = useRef(null);

  const { data: stripeConfig, isLoading: stripeConfigLoading, refetch: refetchStripeConfig } = useQuery({
    queryKey: ["billing", "stripe-config"],
    async queryFn() {
      const response = await fetch("/api/billing/stripe-config/", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch Stripe configuration");
      }
      return response.json();
    },
  });

  // Handle customer session expiration (sessions expire after 30 minutes)
  useEffect(() => {
    if (stripeConfig?.customer_session_client_secret) {
      // Clear any existing timer
      if (sessionRefreshTimerRef.current) {
        clearTimeout(sessionRefreshTimerRef.current);
      }

      // Refresh session 5 minutes before expiration (at 25 minutes)
      // This gives us a buffer in case of network delays
      const refreshInterval = 25 * 60 * 1000; // 25 minutes in milliseconds

      sessionRefreshTimerRef.current = setTimeout(() => {
        refetchStripeConfig();
      }, refreshInterval);

      return () => {
        if (sessionRefreshTimerRef.current) {
          clearTimeout(sessionRefreshTimerRef.current);
        }
      };
    }
  }, [stripeConfig?.customer_session_client_secret, refetchStripeConfig]);

  const { data: subscriptionData, isLoading: subscriptionLoading, isRefetching: isRefetchingSubscription, refetch: refetchSubscription } = useQuery({
    queryKey: ["billing", "subscription"],
    async queryFn() {
      const response = await fetch("/api/billing/subscription/", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
      }
      return response.json();
    },
  });


  return (
    <Block name="billing-page">
      <Elem name="container">
        <Elem name="header">
          <Elem name="title">Billing & Subscription</Elem>
          <Elem name="subtitle">Manage your organization's subscription and billing information</Elem>
        </Elem>

        <Elem name="content">
          <Elem name="section">
            <Elem name="section-title">Current Subscription</Elem>
            {subscriptionLoading ? (
              <Elem name="loading">Loading subscription status...</Elem>
            ) : (
              <SubscriptionStatus data={subscriptionData} onRefresh={refetchSubscription} isRefetching={isRefetchingSubscription} />
            )}
          </Elem>

          {subscriptionData?.status !== "active" && (
            <Elem name="section">
              <Elem name="section-title">Available Plans</Elem>
              {stripeConfigLoading ? (
                <Elem name="loading">Loading pricing information...</Elem>
              ) : (
                <PricingTable
                  pricingTableId={stripeConfig?.pricing_table_id}
                  publishableKey={stripeConfig?.publishable_key}
                  customerEmail={stripeConfig?.customer_email}
                  customerSessionClientSecret={stripeConfig?.customer_session_client_secret}
                />
              )}
            </Elem>
          )}
        </Elem>
      </Elem>
    </Block>
  );
};

BillingPage.title = "Billing";
BillingPage.path = "/billing";
BillingPage.exact = true;

