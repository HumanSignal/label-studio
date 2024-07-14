import { useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { ToastContext } from "../Toast/Toast";
import { FF_OPTIC_2, isFF } from "../../utils/feature-flags";

export const DRAFT_GUARD_KEY = "DRAFT_GUARD";

export const draftGuardCallback = {
  current: null,
};

export const DraftGuard = () => {
  const toast = useContext(ToastContext);
  const history = useHistory();

  useEffect(() => {
    if (isFF(FF_OPTIC_2)) {
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
      const unsubscribe = history.block(() => {
        const selected = window.Htx?.annotationStore?.selected;
        const submissionInProgress = !!selected?.submissionStarted;
        const hasChanges = !!selected?.history.undoIdx && !submissionInProgress;

        if (hasChanges) {
          selected.saveDraftImmediatelyWithResults()?.then((res) => {
            const status = res?.$meta?.status;

            if (status === 200 || status === 201) {
              toast.show({ message: "Draft saved successfully", type: "info" });
              unblock();
            } else if (status !== undefined) {
              toast.show({ message: "There was an error saving your draft", type: "error" });
            } else {
              unblock();
            }
          });

          return DRAFT_GUARD_KEY;
        }
      });

      return () => {
        unblock();
        unsubscribe();
      };
    }
  }, []);

  return <></>;
};
