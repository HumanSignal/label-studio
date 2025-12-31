import { useEffect, useState, useRef } from "react";
import { Block, Elem } from "../../utils/bem";
import "./PricingTable.scss";

export const PricingTable = ({ pricingTableId, publishableKey, customerEmail, customerId }) => {
  // Default values for Stripe pricing table
  const defaultPricingTableId = "prctbl_1ShORfAaooP90eyYgWNjXf6b";
  const defaultPublishableKey = "pk_test_51S916EAaooP90eyYnQBmd8BVWaiRnmakquDXIiswn74iCB2MlCgQ1NLgZZkPhGFI3ynXU8mLwmyw0AJBLX7ae8HR00amTOteUF";

  // Use provided props or fall back to defaults
  const finalPricingTableId = pricingTableId || defaultPricingTableId;
  const finalPublishableKey = publishableKey || defaultPublishableKey;

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    // Check if custom element is already defined (script already loaded)
    if (window.customElements && window.customElements.get('stripe-pricing-table')) {
      setScriptLoaded(true);
      loadedRef.current = true;
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]');
    
    if (existingScript) {
      // Script exists but custom element not yet defined, wait for it
      const checkInterval = setInterval(() => {
        if (window.customElements && window.customElements.get('stripe-pricing-table')) {
          setScriptLoaded(true);
          loadedRef.current = true;
          clearInterval(checkInterval);
        }
      }, 100);

      // Timeout after 10 seconds
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        if (!loadedRef.current) {
          console.error("Stripe pricing table script took too long to load");
          setScriptError(true);
        }
      }, 10000);

      existingScript.addEventListener('error', () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        setScriptError(true);
      });

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
      };
    }

    // Load Stripe pricing table script
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    script.async = true;
    
    let checkInterval = null;
    let timeoutId = null;
    
    script.onload = () => {
      // Wait a bit for custom element to be registered
      checkInterval = setInterval(() => {
        if (window.customElements && window.customElements.get('stripe-pricing-table')) {
          setScriptLoaded(true);
          loadedRef.current = true;
          clearInterval(checkInterval);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }, 100);

      // Timeout after 5 seconds
      timeoutId = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        if (!loadedRef.current) {
          console.error("Stripe pricing table custom element not registered after script load");
          setScriptError(true);
        }
      }, 5000);
    };
    
    script.onerror = () => {
      console.error("Failed to load Stripe pricing table script");
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
      setScriptError(true);
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (scriptError) {
    return (
      <Block name="pricing-table">
        <Elem name="error">
          Failed to load pricing table. Please refresh the page or try again later.
        </Elem>
      </Block>
    );
  }

  if (!scriptLoaded) {
    return (
      <Block name="pricing-table">
        <Elem name="loading">Loading pricing table...</Elem>
      </Block>
    );
  }

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

