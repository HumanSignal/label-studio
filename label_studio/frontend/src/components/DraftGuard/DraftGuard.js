import { useContext, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { ToastContext } from '../Toast/Toast';
import { FF_OPTIC_2, isFF } from '../../utils/feature-flags';

export const DRAFT_GUARD_KEY = "DRAFT_GUARD";

export const draftGuardCallback = {
  current: null,
};

export const DraftGuard = () => {
  const toast = useContext(ToastContext);
  const history = useHistory();

  useEffect(() => {
    if (isFF(FF_OPTIC_2)) {
      const unblock = history.block(() => {
        const selected = window.Htx?.annotationStore?.selected;
        const submissionInProgress = !!selected?.submissionStarted;
        const hasChanges = !!selected?.history.undoIdx && !submissionInProgress;

        if (hasChanges) {
          selected.saveDraftImmediatelyWithResults()?.then((res) => {
            const status = res?.$meta?.status;

            if (status === 200 || status === 201) {
              toast.show({ message: "Draft saved successfully",  type: "info" });
              draftGuardCallback.current?.(true);
              draftGuardCallback.current = null;
            } else if (status !== undefined) {
              toast.show({ message: "There was an error saving your draft", type: "error" });
            }
          });

          return DRAFT_GUARD_KEY;
        }
      });

      return () => {
        draftGuardCallback.current = null;
        unblock();
      };
    }
  }, []);

  return <></>;
};
