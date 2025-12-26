import { useEffect } from "react";
import { Block, Elem } from "../../utils/bem";
import "./PricingTable.scss";

export const PricingTable = ({ pricingTableId, publishableKey, customerEmail, customerId }) => {
  // Default values for Stripe pricing table
  const defaultPricingTableId = "prctbl_1ShORfAaooP90eyYgWNjXf6b";
  const defaultPublishableKey = "pk_test_51S916EAaooP90eyYnQBmd8BVWaiRnmakquDXIiswn74iCB2MlCgQ1NLgZZkPhGFI3ynXU8mLwmyw0AJBLX7ae8HR00amTOteUF";

  // Use provided props or fall back to defaults
  const finalPricingTableId = pricingTableId || defaultPricingTableId;
  const finalPublishableKey = publishableKey || defaultPublishableKey;

  useEffect(() => {
    // Load Stripe pricing table script if not already loaded
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/pricing-table.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <Block name="pricing-table">
      <stripe-pricing-table
        pricing-table-id={finalPricingTableId}
        publishable-key={finalPublishableKey}
        {...(customerEmail && { "customer-email": customerEmail })}
        {...(customerId && { "customer-id": customerId })}
      />
    </Block>
  );
};

