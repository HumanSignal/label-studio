import { loadAndApplyProjectHotkeys } from "@humansignal/app-common/pages/AccountSettings/hooks/useHotkeys";
import { APIConfig } from "./api-config";

/**
 * Construct a DataManager after optionally loading project hotkeys.
 * @param {HTMLElement} root
 * @param {object} props
 * @param {object} params
 * @param {{ isCancelled?: () => boolean }} [options] - When isCancelled() is true after the
 *   async hotkey load (e.g. unmount / destroy bumped a generation), skip constructing a DM.
 */
export const initializeDataManager = async (root, props, params, { isCancelled } = {}) => {
  if (!window.LabelStudio) throw Error("Label Studio Frontend doesn't exist on the page");
  if (!root || root.dataset.dmInitialized) return;

  // Lock before the async hotkey load so overlapping callers cannot both construct a DM.
  root.dataset.dmInitialized = true;

  try {
    const projectId = params.project?.id ?? params.id;
    if (projectId != null) {
      await loadAndApplyProjectHotkeys(projectId);
    }

    // Do not clear dmInitialized here: destroyDM / a newer init may already own the flag.
    if (isCancelled?.()) {
      return;
    }

    const { ...settings } = root.dataset;

    const dmConfig = {
      root,
      projectId: params.id,
      apiGateway: `${window.APP_SETTINGS.hostname}/api/dm`,
      apiVersion: 2,
      project: params.project,
      polling: window.APP_SETTINGS?.polling,
      showPreviews: false,
      apiEndpoints: APIConfig.endpoints,
      interfaces: {
        import: true,
        export: true,
        backButton: false,
        labelingHeader: false,
        autoAnnotation: params.autoAnnotation,
      },
      labelStudio: {
        keymap: window.APP_SETTINGS.editor_keymap,
      },
      ...props,
      ...settings,
    };

    return new window.DataManager(dmConfig);
  } catch (error) {
    delete root.dataset.dmInitialized;
    throw error;
  }
};
