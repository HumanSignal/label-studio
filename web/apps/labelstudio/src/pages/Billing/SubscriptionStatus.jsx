import { Button } from "@humansignal/ui";
import { Block, Elem } from "../../utils/bem";
import "./SubscriptionStatus.scss";

export const SubscriptionStatus = ({ data, onRefresh }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const formatPrice = (amount, currency) => {
    if (!amount || !currency) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status) => {
    if (!status) return { label: "No Subscription", className: "status-none" };
    
    const statusMap = {
      active: { label: "Active", className: "status-active" },
      canceled: { label: "Canceled", className: "status-canceled" },
      past_due: { label: "Past Due", className: "status-past-due" },
      unpaid: { label: "Unpaid", className: "status-unpaid" },
      trialing: { label: "Trialing", className: "status-trialing" },
    };

    return statusMap[status] || { label: status, className: "status-unknown" };
  };

  if (!data || !data.has_subscription) {
    return (
      <Block name="subscription-status">
        <Elem name="empty">
          <Elem name="message">No active subscription</Elem>
          <Elem name="description">Subscribe to a plan to get started.</Elem>
        </Elem>
      </Block>
    );
  }

  const statusBadge = getStatusBadge(data.status);

  return (
    <Block name="subscription-status">
      <Elem name="card">
        <Elem name="header">
          <Elem name="title">Subscription Details</Elem>
          {onRefresh && (
            <Button size="compact" onClick={() => onRefresh()}>
              Refresh
            </Button>
          )}
        </Elem>

        <Elem name="content">
          <Elem name="row">
            <Elem name="label">Status</Elem>
            <Elem name="value">
              <Elem name="badge" mod={{ [statusBadge.className]: true }}>
                {statusBadge.label}
              </Elem>
            </Elem>
          </Elem>

          {data.plan_name && (
            <Elem name="row">
              <Elem name="label">Plan</Elem>
              <Elem name="value">{data.plan_name}</Elem>
            </Elem>
          )}

          {data.plan_amount && data.plan_currency && (
            <Elem name="row">
              <Elem name="label">Price</Elem>
              <Elem name="value">
                {formatPrice(data.plan_amount, data.plan_currency)}
                {data.plan_interval && ` / ${data.plan_interval}`}
              </Elem>
            </Elem>
          )}

          {data.current_period_end && (
            <Elem name="row">
              <Elem name="label">Next Billing Date</Elem>
              <Elem name="value">{formatDate(data.current_period_end)}</Elem>
            </Elem>
          )}

          {data.current_period_start && (
            <Elem name="row">
              <Elem name="label">Current Period Start</Elem>
              <Elem name="value">{formatDate(data.current_period_start)}</Elem>
            </Elem>
          )}

          {data.cancel_at_period_end && (
            <Elem name="row">
              <Elem name="label">Cancellation</Elem>
              <Elem name="value">Will cancel at period end</Elem>
            </Elem>
          )}

          {data.canceled_at && (
            <Elem name="row">
              <Elem name="label">Canceled At</Elem>
              <Elem name="value">{formatDate(data.canceled_at)}</Elem>
            </Elem>
          )}
        </Elem>
      </Elem>
    </Block>
  );
};

