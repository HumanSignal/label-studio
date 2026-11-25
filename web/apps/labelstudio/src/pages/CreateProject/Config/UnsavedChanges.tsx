import { useCallback, useRef, useState } from "react";
import { Button, ModalWindow } from "@humansignal/ui";
import { LeaveBlocker, type LeaveBlockerCallbacks } from "../../../components/LeaveBlocker/LeaveBlocker";
import { Space } from "../../../components/Space/Space";

type SaveAndLeaveButtonProps = {
  onSave: () => Promise<void>;
  text?: string;
};
const SaveAndLeaveButton = ({ onSave, text = "Save and Leave" }: SaveAndLeaveButtonProps) => {
  const [saving, setSaving] = useState(false);
  const saveHandler = useCallback(async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
  }, [onSave]);
  return (
    <Button size="small" onClick={saveHandler} waiting={saving} aria-label="Save changes">
      {text}
    </Button>
  );
};

export type UnsavedChangesRequest = {
  onSave: () => void;
  onCancel?: () => void;
  onDiscard?: () => void;
  cancelText?: string;
  discardText?: string;
  okText?: string;
  title?: string;
  body?: string;
};

/** Asks to save before leaving. `request` is `null` while closed; every button closes it through `onClose`. */
export const UnsavedChangesDialog = ({
  request: openRequest,
  onClose,
}: {
  request: UnsavedChangesRequest | null;
  onClose: () => void;
}) => {
  // Keep the last request while the dialog fades out.
  const lastRequest = useRef(openRequest);
  if (openRequest) lastRequest.current = openRequest;
  const request = lastRequest.current;

  const cancel = () => {
    request?.onCancel?.();
    onClose();
  };

  return (
    <ModalWindow
      open={openRequest !== null}
      onOpenChange={(open) => !open && cancel()}
      title={request?.title ?? "You have unsaved changes."}
      size="small"
      dataTestId="unsaved-changes-modal"
      footer={
        request && (
          <Space align="end">
            <Button look="outlined" size="small" onClick={cancel} autoFocus>
              {request.cancelText ?? "Cancel"}
            </Button>

            {request.onDiscard && (
              <Button
                variant="negative"
                look="outlined"
                onClick={() => {
                  request.onDiscard?.();
                  onClose();
                }}
                size="small"
              >
                {request.discardText ?? "Discard and leave"}
              </Button>
            )}

            <SaveAndLeaveButton
              onSave={async () => {
                await request.onSave?.();
                onClose();
              }}
              text={request.okText}
            />
          </Space>
        )
      }
    >
      {request?.body ?? "Would you like to save them before leaving?"}
    </ModalWindow>
  );
};

type UnsavedChangesProps = {
  hasChanges: boolean;
  onSave: () => any;
};

/**
 * Component that blocks navigation if there are unsaved changes
 * @param hasChanges - flag that indicates if there are unsaved changes
 * @param onSave - function that should be called to save changes
 */
export const UnsavedChanges = ({ hasChanges, onSave }: UnsavedChangesProps) => {
  const [request, setRequest] = useState<UnsavedChangesRequest | null>(null);
  const saveHandlerRef = useRef(onSave);
  saveHandlerRef.current = onSave;
  const blockHandler = useCallback(async ({ continueCallback, cancelCallback }: LeaveBlockerCallbacks) => {
    const wrappedOnSave = async () => {
      const result = await saveHandlerRef.current?.();
      if (result === true) {
        continueCallback && setTimeout(continueCallback, 0);
      } else {
        // We consider that user tries to save changes, but as long as there are some errors,
        // we just close the modal to allow user to see and fix them
        cancelCallback?.();
      }
    };

    setRequest({
      onSave: wrappedOnSave,
      onCancel: cancelCallback,
      onDiscard: continueCallback,
    });
  }, []);

  return (
    <>
      <LeaveBlocker active={hasChanges} onBlock={blockHandler} />
      <UnsavedChangesDialog request={request} onClose={() => setRequest(null)} />
    </>
  );
};
