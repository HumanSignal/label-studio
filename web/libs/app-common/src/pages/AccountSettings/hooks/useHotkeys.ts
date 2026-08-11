import { confirm } from "@humansignal/ui/lib/modal";
import { ToastType, useToast } from "@humansignal/ui/lib/toast/toast";
// @ts-ignore
import { useAPI } from "@humansignal/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { type CustomHotkeys, effectiveHotkeys, mergeCustomHotkeys } from "../hotkeys/effectiveHotkeys";
import {
  type ApiResponse,
  type ExportData,
  getTypedDefaultHotkeys,
  type Hotkey,
  type HotkeySettings,
  type ImportData,
  type SaveResult,
} from "../sections/Hotkeys/utils";

const typedDefaultHotkeys: Hotkey[] = getTypedDefaultHotkeys();

interface HotkeyApiResponse extends ApiResponse {
  $meta?: {
    status?: number;
    ok?: boolean;
  };
}
interface ApiRequestError {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
  request?: unknown;
}

export type HotkeyScope = { kind: "account" } | { kind: "project"; projectId: number };

export const getResetSuccessMessage = (projectId: number | undefined): string =>
  projectId === undefined
    ? "All hotkeys and settings have been reset to defaults and saved"
    : "This project's hotkey override has been reset and saved";

export const getSaveSuccessMessage = (sectionName: string, projectId: number | undefined): string =>
  projectId === undefined ? `${sectionName} account defaults saved` : `${sectionName} project override saved`;

const isApiFailure = (response: HotkeyApiResponse | null): boolean =>
  response === null || Boolean(response.error) || response.$meta?.ok === false;

const isProjectAccessStatus = (status: number | undefined): boolean => status === 403 || status === 404;

const getHotkeyId = (hotkey: Hotkey): string => `${hotkey.section}:${hotkey.element}`;

const hotkeysToCustomHotkeys = (hotkeys: Hotkey[]): CustomHotkeys =>
  Object.fromEntries(
    hotkeys.map((hotkey) => [
      getHotkeyId(hotkey),
      {
        key: hotkey.key,
        active: hotkey.active,
        ...(hotkey.description && { description: hotkey.description }),
      },
    ]),
  );

const updateHotkeysWithCustomSettings = (defaultHotkeys: Hotkey[], customHotkeys: CustomHotkeys): Hotkey[] =>
  defaultHotkeys.map((hotkey) => {
    const customSetting = customHotkeys[getHotkeyId(hotkey)];
    if (!customSetting) return hotkey;

    return {
      ...hotkey,
      key: customSetting.key,
      active: customSetting.active,
      ...(customSetting.description && { description: customSetting.description }),
    };
  });

export const computeProjectOverrides = (hotkeys: Hotkey[], accountHotkeys: CustomHotkeys): CustomHotkeys => {
  const accountEffectiveHotkeys = hotkeysToCustomHotkeys(
    updateHotkeysWithCustomSettings(typedDefaultHotkeys, accountHotkeys),
  );
  const currentHotkeys = hotkeysToCustomHotkeys(hotkeys);

  return Object.fromEntries(
    Object.entries(currentHotkeys).filter(([id, current]) => {
      const accountEffective = accountEffectiveHotkeys[id] ?? accountHotkeys[id];
      if (!accountEffective) return true;

      return (
        current.key !== accountEffective.key ||
        current.active !== accountEffective.active ||
        current.description !== accountEffective.description
      );
    }),
  );
};

const appSettingsCustomHotkeys = (): CustomHotkeys =>
  (window.APP_SETTINGS?.user?.customHotkeys as CustomHotkeys | undefined) ?? {};

let projectHotkeyRequestToken = 0;

/**
 * Drop project-scoped runtime overlays (Help / editor_keymap / Hotkey.keymap) back to the
 * account baseline. Call when leaving a project (DM destroy/unmount) so project overrides
 * do not stick on non-project pages. Invalidates in-flight loadAndApplyProjectHotkeys.
 */
export function clearProjectHotkeysRuntime(): void {
  projectHotkeyRequestToken += 1;
  effectiveHotkeys.apply({ account: effectiveHotkeys.getAccountBaseline() });
}

export async function loadAndApplyProjectHotkeys(projectId: number | string): Promise<void> {
  const requestToken = ++projectHotkeyRequestToken;

  try {
    const response = await fetch(`/api/current-user/hotkeys/?project=${encodeURIComponent(String(projectId))}`, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new Error(`Project hotkey request failed with status ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse;
    if (requestToken !== projectHotkeyRequestToken) return;

    effectiveHotkeys.apply({
      account: effectiveHotkeys.getAccountBaseline(),
      project: data.custom_hotkeys ?? {},
    });
  } catch (error) {
    if (requestToken !== projectHotkeyRequestToken) return;

    effectiveHotkeys.apply({ account: effectiveHotkeys.getAccountBaseline() });
    console.warn("Failed to load project hotkeys; using account defaults:", error);
  }
}

export const useHotkeys = (scope: HotkeyScope = { kind: "account" }) => {
  const toast = useToast();
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);
  const [hotkeySettings, setHotkeySettings] = useState<HotkeySettings>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasProjectAccessError, setHasProjectAccessError] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(scope.kind === "project");
  const api = useAPI();
  const loadAbortRef = useRef<AbortController | null>(null);
  const projectId = scope.kind === "project" ? scope.projectId : undefined;

  const loadHotkeysFromAPI = useCallback(async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    try {
      setIsLoading(true);
      if (projectId !== undefined) {
        setHasProjectAccessError(false);
        setIsReadOnly(true);
      }

      const accountResponse = (await api.callApi("hotkeys")) as HotkeyApiResponse | null;
      if (controller.signal.aborted) return;
      if (projectId !== undefined && isApiFailure(accountResponse)) {
        throw new Error("The account hotkey baseline could not be loaded");
      }

      const accountHotkeys = isApiFailure(accountResponse)
        ? appSettingsCustomHotkeys()
        : (accountResponse?.custom_hotkeys ?? appSettingsCustomHotkeys());

      let effective = accountHotkeys;
      if (projectId !== undefined) {
        const projectResponse = (await api.callApi("hotkeys", {
          params: { project: projectId },
          suppressError: true,
        })) as HotkeyApiResponse | null;
        if (controller.signal.aborted) return;
        if (isApiFailure(projectResponse)) {
          throw new Error("The project hotkey preference could not be loaded");
        }

        effective = mergeCustomHotkeys(accountHotkeys, projectResponse?.custom_hotkeys ?? {});
        effectiveHotkeys.apply({ account: accountHotkeys, project: projectResponse?.custom_hotkeys ?? {} });
      } else {
        effectiveHotkeys.apply({ account: accountHotkeys });
      }

      setHotkeys(updateHotkeysWithCustomSettings(typedDefaultHotkeys, effective));
      setHotkeySettings(accountResponse?.hotkey_settings ?? {});
      setIsReadOnly(false);
    } catch (error) {
      if (controller.signal.aborted) return;

      console.error("Error loading hotkeys from API:", error);
      setHotkeys(updateHotkeysWithCustomSettings(typedDefaultHotkeys, effectiveHotkeys.getAccountBaseline()));
      setHotkeySettings({});

      if (projectId !== undefined) {
        setHasProjectAccessError(true);
        setIsReadOnly(true);
      } else if (toast) {
        toast.show({
          message: "Could not load custom hotkeys from server, using cached settings",
          type: ToastType.error,
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [api, projectId, toast]);

  const saveHotkeysToAPI = useCallback(
    async (currentHotkeys: Hotkey[], currentSettings: HotkeySettings): Promise<SaveResult> => {
      const customHotkeys =
        projectId === undefined
          ? hotkeysToCustomHotkeys(currentHotkeys)
          : computeProjectOverrides(currentHotkeys, effectiveHotkeys.getAccountBaseline());

      const requestBody = {
        custom_hotkeys: customHotkeys,
        hotkey_settings: currentSettings,
      };

      try {
        const response = (await api.callApi("updateHotkeys", {
          ...(projectId !== undefined && { params: { project: projectId } }),
          ...(projectId !== undefined && { suppressError: true }),
          body: requestBody,
        })) as HotkeyApiResponse | null;

        if (isApiFailure(response)) {
          const projectAccessLost = projectId !== undefined && isProjectAccessStatus(response?.$meta?.status);
          if (projectAccessLost) {
            setHasProjectAccessError(true);
            setIsReadOnly(true);
          }
          return {
            ok: false,
            error: response?.error || "Failed to save hotkeys",
            data: response,
            projectAccessLost,
          };
        }

        if (projectId === undefined) {
          effectiveHotkeys.apply({ account: customHotkeys });
        } else {
          effectiveHotkeys.apply({
            account: effectiveHotkeys.getAccountBaseline(),
            project: customHotkeys,
          });
        }

        return {
          ok: true,
          error: undefined,
          data: response,
        };
      } catch (error: unknown) {
        const isReset = currentHotkeys.length === 0;
        const operation = isReset ? "resetting" : "saving";
        console.error(`Error ${operation} hotkeys:`, error);

        let errorMessage = `Failed to ${isReset ? "reset" : "save"} hotkeys`;
        if (error && typeof error === "object" && "response" in error) {
          const err = error as ApiRequestError;
          if (projectId !== undefined && isProjectAccessStatus(err.response?.status)) {
            setHasProjectAccessError(true);
            setIsReadOnly(true);
          }
          if (err.response?.status === 400) {
            errorMessage = err.response.data?.error || `Invalid ${isReset ? "reset request" : "hotkeys configuration"}`;
          } else if (err.response?.status === 401) {
            errorMessage = "Authentication required";
          } else if (err.response?.status >= 500) {
            errorMessage = "Server error - please try again later";
          }
        } else if (error && typeof error === "object" && "request" in error) {
          errorMessage = "Network error - please check your connection";
        }

        return {
          ok: false,
          error: errorMessage,
        };
      }
    },
    [api, projectId],
  );

  const handleResetToDefaults = useCallback(
    (onSuccess?: () => void) => {
      confirm({
        title: projectId === undefined ? "Reset Hotkeys to Defaults?" : "Reset Project Hotkey Override?",
        body:
          projectId === undefined
            ? "Are you sure you want to reset all hotkeys and settings to their default values? This action cannot be undone."
            : "Are you sure you want to reset only this project's hotkey override? Your account defaults and other projects will not be changed.",
        okText: projectId === undefined ? "Reset to Defaults" : "Reset Project Override",
        buttonLook: "negative",
        style: { width: 500 },
        onOk: async () => {
          setIsLoading(true);

          try {
            const result = await saveHotkeysToAPI([], {});
            if (result.ok) {
              if (toast) {
                toast.show({
                  message: getResetSuccessMessage(projectId),
                  type: ToastType.info,
                });
              }
              setHotkeys(updateHotkeysWithCustomSettings(typedDefaultHotkeys, effectiveHotkeys.getAccountBaseline()));
              onSuccess?.();
            } else if (toast) {
              toast.show({
                message: `Failed to save reset hotkeys: ${result.error || "Unknown error"}`,
                type: ToastType.error,
              });
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
    },
    [projectId, saveHotkeysToAPI, toast],
  );

  const handleExportHotkeys = useCallback(() => {
    const exportData: ExportData = {
      hotkeys: hotkeys,
      settings: hotkeySettings,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const exportJson = JSON.stringify(exportData, null, 2);
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = projectId === undefined ? "hotkeys-export.json" : `hotkeys-export-project-${projectId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (toast) {
      toast.show({
        message: "Hotkeys exported successfully",
        type: ToastType.info,
      });
    }
  }, [hotkeys, hotkeySettings, projectId, toast]);

  const handleImportHotkeys = useCallback(
    async (importedData: ImportData | Hotkey[], onSuccess?: () => void): Promise<boolean> => {
      try {
        setIsLoading(true);

        const importedHotkeys = Array.isArray(importedData) ? importedData : importedData.hotkeys || [];
        const importedSettings: HotkeySettings = Array.isArray(importedData) ? {} : importedData.settings || {};

        const result = await saveHotkeysToAPI(importedHotkeys, importedSettings);
        if (!result.ok) {
          throw new Error(result.error || "Failed to save imported hotkeys");
        }

        setHotkeys(importedHotkeys);

        if (toast) {
          toast.show({
            message: "Hotkeys imported successfully",
            type: ToastType.info,
          });
        }

        await loadHotkeysFromAPI();
        onSuccess?.();
        return true;
      } catch (error: unknown) {
        if (toast) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          toast.show({
            message: `Error importing hotkeys: ${errorMessage}`,
            type: ToastType.error,
          });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [saveHotkeysToAPI, loadHotkeysFromAPI, toast],
  );

  useEffect(() => {
    loadHotkeysFromAPI();
    return () => loadAbortRef.current?.abort();
  }, [loadHotkeysFromAPI]);

  return {
    hotkeys,
    setHotkeys,
    hotkeySettings,
    setHotkeySettings,
    isLoading,
    hasProjectAccessError,
    isReadOnly,
    setIsLoading,
    loadHotkeysFromAPI,
    saveHotkeysToAPI,
    handleResetToDefaults,
    handleExportHotkeys,
    handleImportHotkeys,
  };
};
