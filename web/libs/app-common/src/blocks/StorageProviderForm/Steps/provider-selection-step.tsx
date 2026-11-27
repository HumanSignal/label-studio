import { Label } from "@humansignal/ui";
import { useEffect } from "react";
import { ProviderGrid } from "../components";
import type { ProviderConfig } from "../types/provider";

interface ProviderSelectionStepProps {
  formData: {
    provider: string;
  };
  errors: {
    provider?: string;
  };
  handleSelectChange: (name: string, value: string) => void;
  setFormState: (updater: (prevState: any) => any) => void;
  storageTypesLoading?: boolean;
  target?: "import" | "export";
  providers: Record<string, ProviderConfig>;
}

export const ProviderSelectionStep = ({
  formData,
  errors,
  handleSelectChange,
  providers,
}: ProviderSelectionStepProps) => {
  // Set default provider if none is selected and we have options
  useEffect(() => {
    if (!formData.provider && Object.entries(providers).length > 0) {
      // Find the first non-disabled provider
      const enabledProviders = Object.values(providers).filter((provider) => !provider.disabled);
      if (enabledProviders.length > 0) {
        handleSelectChange("provider", enabledProviders[0].name);
      }
    }
  }, [providers, formData.provider, handleSelectChange]);

  // Get the selected provider config
  const selectedProvider = formData.provider ? providers[formData.provider] : null;
  const isSelectedProviderDisabled = selectedProvider?.disabled || false;

  // Get the message content from the provider config
  const getMessageContent = () => {
    if (!selectedProvider?.fields) return null;

    const messageField = selectedProvider.fields.find((field) => field.type === "message");
    return messageField?.content || null;
  };

  const messageContent = getMessageContent();

  return (
    <div className="space-y-wide">
      <div>
        <h2 className="text-xl font-semibold">Choose your cloud storage provider</h2>
        <p className="text-muted-foreground">Select the cloud storage service where your data is stored</p>
      </div>

      <div className="space-y-base">
        <div className="space-y-tight">
          <Label text="Storage Provider" required />
          <ProviderGrid
            providers={providers}
            selectedProvider={formData.provider}
            onProviderSelect={(providerName) => handleSelectChange("provider", providerName)}
            error={errors.provider}
          />
        </div>

        {/* Show alert message when disabled provider is selected */}
        {isSelectedProviderDisabled && messageContent && (
          <div>{typeof messageContent === "function" ? messageContent({}) : messageContent}</div>
        )}
      </div>
    </div>
  );
};
