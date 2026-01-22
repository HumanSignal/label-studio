import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAPI } from "@humansignal/core";
import { isDefined } from "@humansignal/core";
import { getProviderConfig } from "../providers";

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
    (data: any) => {
      if (!isEditMode) return data;

      const cleanedData = { ...data };

      // Get the current provider config to identify access key fields
      const providerConfig = getProviderConfig(data.provider);

      // Get all field names from the current provider schema
      const validFieldNames = new Set([
        "project", // Always include project
        "provider", // Always include provider
        "title", // Always include title
        "prefix", // Common field for bucket prefix
        "path", // Common field for file path (used by redis)
        "use_blob_urls", // Common field for import method
        "regex_filter", // Common field for file filtering
        "recursive_scan", // Common field for recursive scanning
        "can_delete_objects", // Common field for export
        ...(providerConfig?.fields.map((field) => field.name) || []),
      ]);

      // Remove fields that aren't in the current provider's schema
      Object.keys(cleanedData).forEach((key) => {
        if (!validFieldNames.has(key)) {
          delete cleanedData[key];
        }
      });

      // Remove empty values only for access key fields in edit mode
      Object.keys(cleanedData).forEach((key) => {
        const field = providerConfig?.fields.find((f) => f.name === key);
        const isAccessKey = field && "type" in field && (field as any).accessKey;

        // Only remove empty values for access key fields
        if (
          isAccessKey &&
          (cleanedData[key] === "" || cleanedData[key] === undefined || cleanedData[key] === "••••••••••••••••")
        ) {
          delete cleanedData[key];
        }
      });

      return cleanedData;
    },
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
