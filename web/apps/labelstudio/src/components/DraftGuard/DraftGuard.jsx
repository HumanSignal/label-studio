import { useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { ToastContext } from "@humansignal/ui";

export const DRAFT_GUARD_KEY = "DRAFT_GUARD";

export const draftGuardCallback = {
  current: null,
};

const DRAFT_STATUS = {
  SUCCESS: "success",
  FAILURE: "failure",
  NO_CHANGES: "no_changes",
};

export const toastDraftStatus = (status, toast) => {
  switch (status) {
    case DRAFT_STATUS.SUCCESS:
      toast.show({ message: "Draft saved successfully", type: "info" });
      break;
    case DRAFT_STATUS.FAILURE:
      toast.show({ message: "There was an error saving your draft", type: "error" });
      break;
  }
};

/** Uses `Annotation.needsDraftSave()` so draft / preview rules live in one place (FIT-1685). */

function usesCustomInterfaceProject() {
  const dmProject = window.DM?._sdk?.store?.project ?? window.DM?.SDK?.store?.project;
  return Boolean(window.Htx?.project?.use_custom_interface ?? dmProject?.use_custom_interface);
}

function getDataManagerLsfWrapper() {
  const sdk = window.DM?._sdk ?? window.DM?.SDK;
  return sdk?.lsf;
}

async function draftSaveViaDataManager(wrapper) {
  const selected = wrapper.lsf?.annotationStore?.selected;
  if (!selected || selected.submissionStarted) return DRAFT_STATUS.NO_CHANGES;
  if (!wrapper.needsDraftSave(selected)) return DRAFT_STATUS.NO_CHANGES;

  await wrapper.saveDraft();
  return DRAFT_STATUS.SUCCESS;
}

async function draftSaveViaHtx() {
  const selected = window.Htx?.annotationStore?.selected;
  const submissionInProgress = !!selected?.submissionStarted;
  let hasChanges = false;
  try {
    hasChanges = Boolean(selected?.needsDraftSave?.()) && !submissionInProgress;
  } catch (error) {
    console.warn("[DraftGuard] needsDraftSave failed:", error);
  }

  if (!hasChanges) return DRAFT_STATUS.NO_CHANGES;

  const res = await selected.saveDraftImmediatelyWithResults();
  const status = res?.$meta?.status;

  if (status === 200 || status === 201) return DRAFT_STATUS.SUCCESS;
  if (status !== undefined) return DRAFT_STATUS.FAILURE;
  return DRAFT_STATUS.NO_CHANGES;
}

export const draftSave = async () => {
  if (usesCustomInterfaceProject()) {
    return DRAFT_STATUS.NO_CHANGES;
  }

  const lsfWrapper = getDataManagerLsfWrapper();
  if (lsfWrapper?.lsf) {
    try {
      return await draftSaveViaDataManager(lsfWrapper);
    } catch (error) {
      console.warn("[DraftGuard] DataManager saveDraft failed:", error);
      return DRAFT_STATUS.FAILURE;
    }
  }

  if (!window.Htx?.annotationStore?.selected) {
    return DRAFT_STATUS.NO_CHANGES;
  }

  try {
    return await draftSaveViaHtx();
  } catch (error) {
    console.warn("[DraftGuard] saveDraft failed:", error);
    return DRAFT_STATUS.FAILURE;
  }
};

export const DraftGuard = () => {
  const toast = useContext(ToastContext);
  const history = useHistory();

  useEffect(() => {
    const unblock = () => {
      draftGuardCallback.current?.(true);
      draftGuardCallback.current = null;
    };

    /**
     * The version of Router History that is in use does not currently support
     * the `block` method fully. This is a workaround to allow us to block navigation
     * when there are unsaved changes. The draftGuardCallback allows the unblock callback to be captured from the
     * history callback `getUserConfirmation` that is triggered by returning a string message from history.block, allowing the user to
     * confirm they want to leave the page. Here we send through a constant message
     * to signify that we aren't looking for user confirmation but to utilize this to enable navigation blocking based on
     * unsuccessful draft saves.
     */
    const unsubscribe = history.block(async () => {
      const dmLsfActive = Boolean(getDataManagerLsfWrapper()?.lsf);
      const draftStatus = await draftSave();

      // LSFWrapper.saveDraft already shows success/error toasts in Data Manager labeling.
      if (!(dmLsfActive && draftStatus === DRAFT_STATUS.SUCCESS)) {
        toastDraftStatus(draftStatus, toast);
      }
      if (draftStatus !== DRAFT_STATUS.FAILURE) unblock();
      return DRAFT_GUARD_KEY;
    });

    return () => {
      unblock();
      unsubscribe();
    };
  }, []);

  return <></>;
};
