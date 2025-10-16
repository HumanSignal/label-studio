import { confirm } from "@humansignal/ui/lib/modal";
import { ToastType, useToast } from "@humansignal/ui/lib/toast/toast";
// @ts-ignore
import { useAPI } from "@humansignal/core";
import { useCallback, useEffect, useState } from "react";
import {
  type ApiResponse,
  type ExportData,
  getTypedDefaultHotkeys,
  type Hotkey,
  type HotkeySettings,
  type ImportData,
  type SaveResult,
} from "../sections/Hotkeys/utils";

// Type the imported defaults and convert numeric ids to strings
const typedDefaultHotkeys: Hotkey[] = getTypedDefaultHotkeys();

export const useHotkeys = () => {
  const toast = useToast();
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const api = useAPI();

  // Update hotkeys with custom settings
  const updateHotkeysWithCustomSettings = useCallback(
    (
      defaultHotkeys: Hotkey[],
      customHotkeys: Record<string, { key: string; active: boolean; description?: string }>,
    ): Hotkey[] => {
      return defaultHotkeys.map((hotkey: Hotkey) => {
        // Create the lookup key format used in the API response (section:element)
        const lookupKey = `${hotkey.section}:${hotkey.element}`;

        // Check if there's a custom setting for this hotkey
        if (customHotkeys[lookupKey]) {
          const customSetting = customHotkeys[lookupKey];
          // Create a new object with the default properties and override with custom ones
          return {
            ...hotkey,
            key: customSetting.key,
            active: customSetting.active,
            // Preserve the original label, only update description if provided
            ...(customSetting.description && {
              description: customSetting.description,
            }),
          };
        }

        // If no custom setting exists, return the default hotkey unchanged
        return hotkey;
      });
    },
    [],
  );

  // Simple hotkey reload - just update global state and call setKeymap
  const reloadHotkeysInRuntime = useCallback(
    (customHotkeys: Record<string, { key: string; active: boolean; description?: string }>) => {
      // Update APP_SETTINGS.user.customHotkeys (for Help modal and fallback)
      if (window.APP_SETTINGS?.user) {
        window.APP_SETTINGS.user.customHotkeys = customHotkeys;
      }

      const EditorHotkey = window.Htx?.Hotkey;

      // Transform custom hotkeys to editor format (same logic as base.html)
      const editorCustomHotkeys: Record<string, any> = {};
      const prefixRegex = /^(annotation|timeseries|audio|regions|video|image_gallery|tools):(.*)/;

      for (const key in customHotkeys) {
        const match = key.match(prefixRegex);
        if (match) {
          const [, , shortKey] = match;
          const value = customHotkeys[key];

          if (value && value.active === false) {
            editorCustomHotkeys[shortKey] = { ...value, key: null };
          } else {
            editorCustomHotkeys[shortKey] = value;
          }
        }
      }

      // Get current keymap and merge with custom hotkeys
      const currentKeymap = EditorHotkey?.keymap ? { ...EditorHotkey.keymap } : {};
      const mergedKeymap = Object.assign({}, currentKeymap, editorCustomHotkeys);

      // Update APP_SETTINGS.editor_keymap (for DataManager/Explorer)
      if (window.APP_SETTINGS) {
        window.APP_SETTINGS.editor_keymap = mergedKeymap;
      }

      // Call Hotkey.setKeymap() - the main propagation path
      try {
        EditorHotkey?.setKeymap(mergedKeymap as any);
      } catch (error) {
        console.warn("Failed to update hotkeys:", error);
      }
    },
    [],
  );

  // Load hotkeys from API
  const loadHotkeysFromAPI = useCallback(async () => {
    try {
      setIsLoading(true);

      // Use proper API endpoint name from the config
      const response = await api.callApi("hotkeys" as any);

      if (response && (response as ApiResponse).custom_hotkeys) {
        // Use API data
        const apiResponse = response as ApiResponse;
        const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, apiResponse.custom_hotkeys || {});
        setHotkeys(updatedHotkeys);
        // Store current settings from API response
        setHotkeySettings(apiResponse.hotkey_settings || {});
      } else {
        // Fallback to window.APP_SETTINGS
        const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
        const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, customHotkeys);
        setHotkeys(updatedHotkeys);
        // No settings available in fallback
        setHotkeySettings({});
      }
    } catch (error) {
      console.error("Error loading hotkeys from API:", error);

      // Fallback to window.APP_SETTINGS on error
      const customHotkeys = window.APP_SETTINGS?.user?.customHotkeys || {};
      const updatedHotkeys = updateHotkeysWithCustomSettings(typedDefaultHotkeys, customHotkeys);
      setHotkeys(updatedHotkeys);
      // No settings available in fallback
      setHotkeySettings({});

      // Show non-blocking error notification
      if (toast) {
        toast.show({
          message: "Could not load custom hotkeys from server, using cached settings",
          type: ToastType.error,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, toast, updateHotkeysWithCustomSettings]);

  // Save hotkeys to API function (handles both save and reset operations)
  const saveHotkeysToAPI = useCallback(
    async (currentHotkeys: Hotkey[], currentSettings: HotkeySettings): Promise<SaveResult> => {
      // Convert current hotkeys to API format - INCLUDE description to maintain API compatibility
      const customHotkeys: Record<string, { key: string; active: boolean; description?: string }> = {};

      // Process all current hotkeys (if empty, this results in reset)
      currentHotkeys.forEach((hotkey: Hotkey) => {
        const keyId = `${hotkey.section}:${hotkey.element}`;
        customHotkeys[keyId] = {
          key: hotkey.key,
          active: hotkey.active,
          ...(hotkey.description && { description: hotkey.description }),
        };
      });

      const requestBody = {
        custom_hotkeys: customHotkeys,
        hotkey_settings: currentSettings,
      };

      try {
        // Use proper API endpoint name from the config
        const response = await api.callApi("updateHotkeys" as any, {
          body: requestBody,
        });

        // Check for API-level errors
        if (response?.error) {
          return {
            ok: false,
            error: response.error,
            data: response,
          };
        }

        // Apply hotkeys immediately without page refresh
        reloadHotkeysInRuntime(customHotkeys);

        return {
          ok: true,
          error: undefined,
          data: response,
        };
      } catch (error: unknown) {
        const isReset = currentHotkeys.length === 0;
        const operation = isReset ? "resetting" : "saving";
        console.error(`Error ${operation} hotkeys:`, error);

        // Provide more specific error messages
        let errorMessage = `Failed to ${isReset ? "reset" : "save"} hotkeys`;
        if (error && typeof error === "object" && "response" in error) {
          const err = error as any;
          // Server responded with error status
          if (err.response?.status === 400) {
            errorMessage = err.response.data?.error || `Invalid ${isReset ? "reset request" : "hotkeys configuration"}`;
          } else if (err.response?.status === 401) {
            errorMessage = "Authentication required";
          } else if (err.response?.status >= 500) {
            errorMessage = "Server error - please try again later";
          }
        } else if (error && typeof error === "object" && "request" in error) {
          // Network error
          errorMessage = "Network error - please check your connection";
        }

        return {
          ok: false,
          error: errorMessage,
        };
      }
    },
    [api],
  );

  // Handle resetting all hotkeys to defaults
  const handleResetToDefaults = useCallback(() => {
    confirm({
      title: "Reset Hotkeys to Defaults?",
      body: "Are you sure you want to reset all hotkeys and settings to their default values? This action cannot be undone.",
      okText: "Reset to Defaults",
      buttonLook: "negative",
      style: { width: 500 },
      onOk: async () => {
        setIsLoading(true);

        try {
          // Reset hotkeys to defaults in the backend API (sets custom_hotkeys to {})
          const result = await saveHotkeysToAPI([], {});

          if (result.ok) {
            if (toast) {
              toast.show({
                message: "All hotkeys and settings have been reset to defaults and saved",
                type: ToastType.info,
              });
            }
            // Update local state to reflect the reset
            setHotkeys([...typedDefaultHotkeys]);
          } else {
            if (toast) {
              toast.show({
                message: `Failed to save reset hotkeys: ${result.error || "Unknown error"}`,
                type: ToastType.error,
              });
            }
          }
        } catch (error: unknown) {
          if (toast) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast.show({
              message: `Error resetting hotkeys: ${errorMessage}`,
              type: ToastType.error,
            });
          }
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [saveHotkeysToAPI, toast]);

  // Handle exporting hotkeys
  const handleExportHotkeys = useCallback(() => {
    // Create export data including current settings
    const exportData: ExportData = {
      hotkeys: hotkeys,
      settings: hotkeySettings,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    // Create a JSON string of the export data
    const exportJson = JSON.stringify(exportData, null, 2);

    // Create a blob with the JSON
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it to download the file
    const link = document.createElement("a");
    link.href = url;
    link.download = "hotkeys-export.json";
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (toast) {
      toast.show({
        message: "Hotkeys exported successfully",
        type: ToastType.info,
      });
    }
  }, [hotkeys, hotkeySettings, toast]);

  // Handle importing hotkeys
  const handleImportHotkeys = useCallback(
    async (importedData: ImportData | Hotkey[]) => {
      try {
        setIsLoading(true);

        // Handle both old format (just hotkeys array) and new format (with settings)
        const importedHotkeys = Array.isArray(importedData) ? importedData : importedData.hotkeys || [];
        const importedSettings: HotkeySettings = Array.isArray(importedData) ? {} : importedData.settings || {};

        // Save all imported data to API
        const result = await saveHotkeysToAPI(importedHotkeys, importedSettings);

        if (!result.ok) {
          throw new Error(result.error || "Failed to save imported hotkeys");
        }

        // Update local state
        setHotkeys(importedHotkeys);

        if (toast) {
          toast.show({
            message: "Hotkeys imported successfully",
            type: ToastType.info,
          });
        }

        // Reload from API to ensure consistency
        await loadHotkeysFromAPI();
      } catch (error: unknown) {
        if (toast) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          toast.show({
            message: `Error importing hotkeys: ${errorMessage}`,
            type: ToastType.error,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [saveHotkeysToAPI, loadHotkeysFromAPI, toast],
  );

  // Load hotkeys on hook mount
  useEffect(() => {
    loadHotkeysFromAPI();
  }, [loadHotkeysFromAPI]);

  return {
    hotkeys,
    setHotkeys,
    hotkeySettings,
    setHotkeySettings,
    isLoading,
    setIsLoading,
    loadHotkeysFromAPI,
    saveHotkeysToAPI,
    handleResetToDefaults,
    handleExportHotkeys,
    handleImportHotkeys,
  };
};
