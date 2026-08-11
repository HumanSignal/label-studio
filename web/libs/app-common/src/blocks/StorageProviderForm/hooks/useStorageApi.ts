import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { isDefined, useAPI } from "@humansignal/core";
import { cleanStorageFormDataForSubmission } from "./cleanStorageFormData";

interface UseStorageApiProps {
  target?: "import" | "export";
  storage?: any;
  project?: number;
  onSubmit: () => void;
  onClose: () => void;
  onValidationError?: (errors: Record<string, string>) => void;
}

const normalizeValidationErrors = (errors: Record<string, string | string[]>) => {
  const normalized: Record<string, string> = {};

  Object.entries(errors).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      normalized[field] = messages.filter(Boolean).join(" ");
    } else if (typeof messages === "string") {
      normalized[field] = messages;
    }
  });

  return normalized;
};

export const useStorageApi = ({
  target,
  storage,
  project,
  onSubmit,
  onClose,
  onValidationError,
}: UseStorageApiProps) => {
  const api = useAPI();
  const isEditMode = Boolean(storage);
  const action = storage ? "updateStorage" : "createStorage";

  const handleValidationErrors = useCallback(
    (result: any) => {
      const validationErrors = result?.response?.validation_errors;
      if (validationErrors && onValidationError) {
        onValidationError(normalizeValidationErrors(validationErrors));
      }
    },
    [onValidationError],
  );

  const errorFilter = useCallback((result: any) => {
    return result?.$meta?.status === 400;
  }, []);

  // Clean form data for submission
  const cleanFormDataForSubmission = useCallback(
    (data: any) => cleanStorageFormDataForSubmission(data, isEditMode),
    [isEditMode],
  );

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionData: any) => {
      if (!api) throw new Error("API context not available");

      const cleanedData = cleanFormDataForSubmission(connectionData);
      const body = { ...cleanedData };

      if (isDefined(storage?.id)) {
        body.id = storage.id;
      }

      const result = await api.callApi("validateStorage", {
        params: {
          target,
          type: connectionData.provider,
        },
        body,
        errorFilter,
      });
      if (result?.error) {
        handleValidationErrors(result);
      }
      return result;
    },
  });

  // Sync storage mutation
  const syncStorageMutation = useMutation({
    mutationFn: async (storageData: any) => {
      if (!api) throw new Error("API context not available");

      return api.callApi("syncStorage", {
        params: {
          target,
          type: storageData.provider,
          pk: storageData.id,
        },
      });
    },
  });

  // Create/Update storage mutation (with sync)
  const createStorageMutation = useMutation({
    mutationFn: async (storageData: any) => {
      if (!api) throw new Error("API context not available");

      const cleanedData = cleanFormDataForSubmission(storageData);
      const body = { ...cleanedData };

      if (isDefined(storage?.id)) {
        body.id = storage.id;
      }

      // First, save the storage
      const result = await api.callApi(action, {
        params: {
          target,
          type: storageData.provider,
          project,
          pk: storage?.id,
        },
        body,
        errorFilter,
      });
      if (result?.error) {
        handleValidationErrors(result);
      }

      // Only if storage save was successful, then trigger sync for import storages
      if (result?.$meta?.ok && target !== "export" && result?.id) {
        try {
          await api.callApi("syncStorage", {
            params: {
              target,
              type: storageData.provider,
              pk: result.id,
            },
          });
        } catch (error) {
          console.error("Failed to auto-sync storage:", error);
          // Don't fail the entire operation if sync fails
        }
      }

      return result;
    },
    onSuccess: (response) => {
      if (response?.$meta?.ok) {
        onSubmit();
        onClose();
      }
    },
  });

  // Save storage mutation (without sync)
  const saveStorageMutation = useMutation({
    mutationFn: async (storageData: any) => {
      if (!api) throw new Error("API context not available");

      const cleanedData = cleanFormDataForSubmission(storageData);
      const body = { ...cleanedData };

      if (isDefined(storage?.id)) {
        body.id = storage.id;
      }

      // Only save the storage, don't sync
      const result = await api.callApi(action, {
        params: {
          target,
          type: storageData.provider,
          project,
          pk: storage?.id,
        },
        body,
        errorFilter,
      });
      if (result?.error) {
        handleValidationErrors(result);
      }

      return result;
    },
    onSuccess: (response) => {
      if (response?.$meta?.ok) {
        onSubmit();
        onClose();
      }
    },
  });

  // Load files preview mutation
  const loadFilesPreviewMutation = useMutation({
    mutationFn: async (previewData: any) => {
      if (!api) throw new Error("API context not available");

      const cleanedData = cleanFormDataForSubmission(previewData);
      const body = { ...cleanedData };

      if (isDefined(storage?.id)) {
        body.id = storage.id;
        body.limit = 30;
      }

      const result = await api.callApi<{ files: any[] }>("storageFiles", {
        params: {
          target,
          type: previewData.provider,
        },
        body,
        errorFilter,
      });
      if ((result as any)?.error) {
        handleValidationErrors(result);
      }
      return result;
    },
  });

  return {
    testConnectionMutation,
    createStorageMutation,
    saveStorageMutation,
    loadFilesPreviewMutation,
    syncStorageMutation,
    isEditMode,
    action,
  };
};
