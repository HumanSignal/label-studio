import { useQuery } from "@tanstack/react-query";
import { useAPI } from "../../providers/ApiProvider";
import { useCurrentUser } from "../../providers/CurrentUser";
import { Block, Elem } from "../../utils/bem";
import { PricingTable } from "./PricingTable";
import { SubscriptionStatus } from "./SubscriptionStatus";
import "./BillingPage.scss";

export const BillingPage = () => {
  const api = useAPI();
  const { user } = useCurrentUser();

  const { data: stripeConfig, isLoading: stripeConfigLoading } = useQuery({
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

          {(!subscriptionData?.has_subscription || subscriptionData?.status === "canceled") && (
            <Elem name="section">
              <Elem name="section-title">Available Plans</Elem>
              {stripeConfigLoading ? (
                <Elem name="loading">Loading pricing information...</Elem>
              ) : (
                <PricingTable
                  pricingTableId={stripeConfig?.pricing_table_id}
                  publishableKey={stripeConfig?.publishable_key}
                  customerEmail={stripeConfig?.customer_email}
                  customerId={stripeConfig?.customer_id}
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

