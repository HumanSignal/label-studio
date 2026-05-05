import { useAtomValue } from "jotai";
import { Badge, Tooltip } from "@humansignal/ui";
import { billingStatusAtom } from "../../atoms/billing";

interface PlanBadgeProps {
  className?: string;
}

export const PlanBadge = ({ className }: PlanBadgeProps) => {
  const { data, isLoading, isError } = useAtomValue(billingStatusAtom);

  if (isLoading || isError || !data?.plan) return null;

  const plan = data.plan;
  const planLabels: Record<string, string> = {
    free: "Free",
    standard: "Standard",
    pro: "Pro",
  };
  const planTooltips: Record<string, string> = {
    free: "Your organization is on Free",
    standard: "Your organization is on Standard",
    pro: "Your organization is on Pro",
  };

  const variant = plan === "pro" ? "info" : plan === "standard" ? "success" : "secondary";

  return (
    <Tooltip title={planTooltips[plan] || "Your organization plan"}>
      <Badge className={className} variant={variant}>
        {planLabels[plan] || plan}
      </Badge>
    </Tooltip>
  );
};



