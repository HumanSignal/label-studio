import { useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { ToastContext } from "@humansignal/ui";
import { isAlive } from "mobx-state-tree";

export const DRAFT_GUARD_KEY = "DRAFT_GUARD";

export const draftGuardCallback = {
  current: null,
};

export const DraftGuard = () => {
  const toast = useContext(ToastContext);
  const history = useHistory();

  useEffect(() => {
    const unblockDraftGuard = () => {
      draftGuardCallback.current?.(true);
      draftGuardCallback.current = null;
    };

    const getSafeSelected = () => {
      try {
        const selected = window.Htx?.annotationStore?.selected;

        if (!selected) return null;
        if (typeof isAlive === "function" && !isAlive(selected)) return null;

        return selected;
      } catch (error) {
        // #region agent log
        fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DraftGuard.jsx:42',message:'Error accessing selected',data:{error:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return null;
      }
    };

    const hasUnsavedChanges = (selected) => {
      if (!selected) return false;

      try {
        const submissionInProgress = !!selected.submissionStarted;
        const historyObj = selected.history;
        const hasChanges = !!historyObj?.undoIdx && !submissionInProgress;
        // #region agent log
        fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DraftGuard.jsx:56',message:'History accessed successfully',data:{hasChanges,submissionInProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return hasChanges;
      } catch (error) {
        // #region agent log
        fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DraftGuard.jsx:63',message:'Error accessing history',data:{error:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return false;
      }
    };

    const saveDraftSafely = async (selected) => {
      try {
        const res = await selected.saveDraftImmediatelyWithResults?.();
        const status = res?.$meta?.status;

        if (status === 200 || status === 201) {
          toast.show({ message: "Draft saved successfully", type: "info" });
          unblockDraftGuard();
        } else if (status !== undefined) {
          toast.show({ message: "There was an error saving your draft", type: "error" });
        } else {
          unblockDraftGuard();
        }
      } catch (error) {
        // If the draft save fails because the store was detached, allow navigation to proceed
        // #region agent log
        fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DraftGuard.jsx:81',message:'Error saving draft',data:{error:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        unblockDraftGuard();
      }
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
    let unsubscribe = () => {};

    try {
      unsubscribe = history.block(() => {
        // #region agent log
        fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DraftGuard.jsx:101',message:'DraftGuard block called',data:{hasHtx:!!window.Htx,hasAnnotationStore:!!window.Htx?.annotationStore,hasSelected:!!window.Htx?.annotationStore?.selected,pathname:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        const selected = getSafeSelected();

        if (!selected || !hasUnsavedChanges(selected)) {
          return undefined;
        }

        // Trigger async draft save and block navigation until it completes
        void saveDraftSafely(selected);
        return DRAFT_GUARD_KEY;
      });
    } catch (error) {
      // If history.block itself fails for some reason, don't crash the app
      // #region agent log
      fetch('http://localhost:7242/ingest/72ea390b-662d-4988-92ef-c2108a4eb656',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DraftGuard.jsx:119',message:'Error setting up history.block',data:{error:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    return () => {
      unblockDraftGuard();
      unsubscribe?.();
    };
  }, [history, toast]);

  return <></>;
};
