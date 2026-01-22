import { forwardRef, useCallback, useEffect, useState } from "react";
import { useModalControls } from "@humansignal/ui/lib/modal";
import { Stepper, ProviderSelectionStep, ProviderDetailsStep, PreviewStep, ReviewStep } from "./Steps";
import { FormHeader } from "./components/form-header";
import { FormFooter } from "./components/form-footer";
import { useStorageForm } from "./hooks/useStorageForm";
import { useStorageApi } from "./hooks/useStorageApi";
import { step1Schema, getProviderSchema } from "./schemas";
import { addProvider } from "./providers";
import type { ProviderConfig } from "./types/provider";
import { InlineError } from "apps/labelstudio/src/components/Error/InlineError";

interface StorageProviderFormProps {
  onSubmit: () => void;
  target?: "import" | "export";
  project?: any;
  storage?: any;
  title?: string;
  storageTypes: {
    title: string;
    name: string;
  }[];
  providers: Record<string, ProviderConfig>;
  defaultValues?: Record<string, Record<string, any>>;
  onClose?: () => void;
  onHide?: () => void;
}

export const StorageProviderForm = forwardRef<unknown, StorageProviderFormProps>(
  (
    { onSubmit, target, project, storage, title, storageTypes, providers, defaultValues, onClose = () => {}, onHide },
    ref,
  ) => {
    const modal = useModalControls();
    const [type, setType] = useState<string | undefined>(storage?.type || storage?.provider || "s3");
    const [filesPreview, setFilesPreview] = useState<any[] | null>(null);
    const [connectionChecked, setConnectionChecked] = useState(false);

    const handleClose = () => {
      resetForm();
      setFilesPreview(null);
      setConnectionChecked(false);
      setType("s3");
      onClose();
      modal?.hide();
    };

    // Initialize providers first
    useEffect(() => {
      Object.entries(providers).forEach(([name, config]) => {
        addProvider(name, config);
      });
    }, [providers]);

    // Determine if we're in edit mode
    const isEditMode = Boolean(storage);

    // Define steps based on edit mode and target
    const effectiveTarget = target || "import"; // Default to import if target is undefined
    const steps = isEditMode
      ? [
          {
            title: "Configure Connection",
            schema: getProviderSchema(type || "s3", isEditMode, effectiveTarget),
          },
          // Only include preview and review steps for import storages
          ...(effectiveTarget === "import"
            ? [{ title: "Import Settings & Preview" }, { title: "Review & Confirm" }]
            : []),
        ]
      : [
          { title: "Select Provider", schema: step1Schema },
          {
            title: "Configure Connection",
            schema: getProviderSchema(type || "s3", isEditMode, effectiveTarget),
          },
          // Only include preview and review steps for import storages
          ...(effectiveTarget === "import"
            ? [{ title: "Import Settings & Preview" }, { title: "Review & Confirm" }]
            : []),
        ];

    // Update steps when provider changes to ensure schema is current
    const [currentSteps, setCurrentSteps] = useState(steps);

    // Initialize form state management
    const {
      formState,
      setFormState,
      errors,
      setErrors,
      validateEntireForm,
      handleProviderFieldChange,
      handleFieldBlur,
      setCurrentStep,
      resetForm,
    } = useStorageForm({
      project,
      isEditMode,
      steps: currentSteps,
      storage,
      defaultValues,
    });

    const { currentStep, formData } = formState;

    // Update type when formData.provider changes in edit mode
    useEffect(() => {
      if (isEditMode && formData.provider && formData.provider !== type) {
        setType(formData.provider);
      }
    }, [isEditMode, formData.provider, type]);

    useEffect(() => {
      const effectiveTarget = target || "import";
      const newSteps = isEditMode
        ? [
            {
              title: "Configure Connection",
              schema: getProviderSchema(formData.provider || type || "s3", isEditMode, effectiveTarget),
            },
            // Only include preview and review steps for import storages
            ...(effectiveTarget === "import"
              ? [{ title: "Import Settings & Preview" }, { title: "Review & Confirm" }]
              : []),
          ]
        : [
            { title: "Select Provider", schema: step1Schema },
            {
              title: "Configure Connection",
              schema: getProviderSchema(formData.provider || type || "s3", isEditMode, effectiveTarget),
            },
            // Only include preview and review steps for import storages
            ...(effectiveTarget === "import"
              ? [{ title: "Import Settings & Preview" }, { title: "Review & Confirm" }]
              : []),
          ];
      setCurrentSteps(newSteps);
    }, [formData.provider, type, isEditMode, target]);

    // Handle modal hide (including Escape key)
    useEffect(() => {
      if (onHide) {
        const handleModalHide = () => {
          resetForm();
          setFilesPreview(null);
          setConnectionChecked(false);
          setType("s3");
          onHide();
        };

        // Set up the handler but don't call it immediately
        // The handler will be called when the modal is actually hidden
      }
    }, [onHide, resetForm]);

    // Sync backend validation_errors to current form errors so inputs show the exact API message
    // instead of surfacing a global modal. The API hook normalizes DRF's shape into
    // { fieldName: "message" }, which we merge into our stateful error map.
    const handleServerValidationErrors = useCallback(
      (serverErrors: Record<string, string>) => {
        if (!serverErrors || Object.keys(serverErrors).length === 0) return;
        setErrors((prev) => ({
          ...prev,
          ...serverErrors,
        }));
      },
      [setErrors],
    );

    // Initialize API hooks
    const { testConnectionMutation, createStorageMutation, saveStorageMutation, loadFilesPreviewMutation, action } =
      useStorageApi({
        target,
        storage,
        project,
        onSubmit,
        onValidationError: handleServerValidationErrors,
        onClose: () => {
          resetForm();
          setFilesPreview(null);
          setConnectionChecked(false);
          setType("s3");
          onClose();
          modal?.hide();
        },
      });

    // Handle provider selection
    const handleSelectChange = (name: string, value: string) => {
      setType(value);
      handleProviderFieldChange(name, value, () => {
        setFilesPreview(null);
        setConnectionChecked(false);
      });
    };

    // Handle form navigation
    const handleStepClick = (stepIndex: number) => {
      if (isEditMode || stepIndex <= currentStep) {
        setCurrentStep(stepIndex);
      }
    };

    const nextStep = () => {
      if (validateEntireForm()) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          createStorageMutation.mutate(formData);
        }
      }
    };

    const saveOnly = () => {
      if (validateEntireForm()) {
        saveStorageMutation.mutate(formData);
      }
    };

    const prevStep = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    };

    // Handle API operations
    const testStorageConnection = async () => {
      if (!validateEntireForm()) return;
      testConnectionMutation.mutate(formData, {
        onSuccess: (response) => {
          const isSuccess = response?.$meta?.ok || response?.$meta?.status === 200;
          setConnectionChecked(isSuccess);
        },
        onError: () => {
          setConnectionChecked(false);
        },
      });
    };

    const loadFilesPreview = async () => {
      if (!validateEntireForm()) return;
      loadFilesPreviewMutation.mutate(formData, {
        onSuccess: (response) => {
          if (response?.files) {
            setFilesPreview(response.files);
          } else {
            setFilesPreview(null);
          }
        },
        onError: () => {
          setFilesPreview(null);
        },
      });
    };

    // Format file size helper
    const formatSize = (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
    };

    return (
      <div className="flex flex-col h-full w-full">
        <FormHeader title={title} onClose={handleClose} />

        <Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} isEditMode={isEditMode} />

        <div className="px-wide py-base">
          {(() => {
            const actualStep = isEditMode ? currentStep + 1 : currentStep;

            switch (actualStep) {
              case 0:
                return (
                  <ProviderSelectionStep
                    formData={formData}
                    errors={errors}
                    handleSelectChange={handleSelectChange}
                    setFormState={setFormState}
                    providers={providers}
                    target={target}
                  />
                );
              case 1:
                return (
                  <ProviderDetailsStep
                    formData={formData}
                    errors={errors}
                    handleProviderFieldChange={(name: string, value: any) => {
                      handleProviderFieldChange(name, value, () => {
                        setFilesPreview(null);
                        setConnectionChecked(false);
                      });
                    }}
                    handleFieldBlur={handleFieldBlur}
                    provider={formData.provider || "s3"}
                    isEditMode={isEditMode}
                    target={effectiveTarget}
                  />
                );
              case 2:
                return (
                  <PreviewStep
                    formData={formData}
                    formState={formState}
                    setFormState={setFormState}
                    handleChange={(e) => {
                      const { name, value } = e.target as HTMLInputElement;
                      handleProviderFieldChange(name, value, () => {
                        setFilesPreview(null);
                        setConnectionChecked(false);
                      });
                    }}
                    action={action}
                    target={effectiveTarget}
                    type={type!}
                    project={project}
                    storage={storage}
                    onSubmit={onSubmit}
                    formRef={ref}
                    filesPreview={filesPreview}
                    formatSize={formatSize}
                    onImportSettingsChange={() => {
                      setFilesPreview(null);
                      setConnectionChecked(false);
                    }}
                  />
                );
              case 3:
                return <ReviewStep formData={formData} filesPreview={filesPreview} formatSize={formatSize} />;
              default:
                return null;
            }
          })()}
        </div>

        <div className="p-tight">
          <InlineError includeValidation minimal />
        </div>

        <FormFooter
          currentStep={currentStep}
          totalSteps={steps.length}
          onPrevious={prevStep}
          onNext={nextStep}
          onSave={saveOnly}
          isEditMode={isEditMode}
          connectionChecked={connectionChecked}
          filesPreview={filesPreview}
          testConnection={{
            isLoading: testConnectionMutation.isLoading,
            mutate: testStorageConnection,
          }}
          loadPreview={{
            isLoading: loadFilesPreviewMutation.isLoading,
            mutate: loadFilesPreview,
          }}
          createStorage={{
            isLoading: createStorageMutation.isLoading,
          }}
          saveStorage={{
            isLoading: saveStorageMutation.isLoading,
          }}
          target={effectiveTarget}
          isProviderDisabled={providers[formData.provider]?.disabled || false}
        />
      </div>
    );
  },
);
