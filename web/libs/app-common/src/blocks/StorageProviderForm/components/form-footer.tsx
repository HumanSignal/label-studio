import { Button } from "@humansignal/ui";

interface FormFooterProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSave?: () => void;
  isEditMode: boolean;
  connectionChecked: boolean;
  filesPreview: any[] | null;
  testConnection: {
    isLoading: boolean;
    mutate: () => void;
  };
  loadPreview: {
    isLoading: boolean;
    mutate: () => void;
  };
  createStorage: {
    isLoading: boolean;
  };
  saveStorage?: {
    isLoading: boolean;
  };
  target?: "import" | "export";
  isProviderDisabled?: boolean;
}

export const FormFooter = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSave,
  isEditMode,
  connectionChecked,
  filesPreview,
  testConnection,
  loadPreview,
  createStorage,
  saveStorage,
  target,
  isProviderDisabled = false,
}: FormFooterProps) => {
  return (
    <div className="flex items-center justify-between">
      <Button look="outlined" onClick={onPrevious} disabled={currentStep === 0}>
        Previous
      </Button>

      <div className="flex gap-tight items-center">
        {(isEditMode ? currentStep === 0 : currentStep === 1) && (
          <>
            <Button
              waiting={testConnection.isLoading}
              onClick={testConnection.mutate}
              variant={connectionChecked ? "positive" : "primary"}
            >
              {connectionChecked ? "Connection Verified" : "Test Connection"}
            </Button>
          </>
        )}

        {(isEditMode ? currentStep === 1 : currentStep === 2) && (
          <Button waiting={loadPreview.isLoading} onClick={loadPreview.mutate} disabled={filesPreview !== null}>
            {filesPreview !== null ? "✓ Preview Loaded" : "Load Preview"}
          </Button>
        )}

        <Button
          onClick={onNext}
          waiting={currentStep === totalSteps - 1 && createStorage.isLoading}
          disabled={
            (!isEditMode && currentStep === 1 && !connectionChecked) || (currentStep === 0 && isProviderDisabled)
          }
          look={currentStep === totalSteps - 1 && target !== "export" ? "outlined" : undefined}
          tooltip={
            currentStep === 1 && !connectionChecked
              ? "Test connection before continuing"
              : currentStep === 0 && isProviderDisabled
                ? "This provider is not available in the current version"
                : undefined
          }
        >
          {currentStep < totalSteps - 1 ? "Next" : target === "export" ? "Save" : "Save & Sync"}
        </Button>

        {currentStep === totalSteps - 1 && target !== "export" && onSave && (
          <Button onClick={onSave} waiting={saveStorage?.isLoading}>
            Save
          </Button>
        )}
      </div>
    </div>
  );
};
