import React, { useCallback, useRef } from "react";
import { Button } from "../../../components";
import { LeaveBlocker, type LeaveBlockerCallbacks } from "../../../components/LeaveBlocker/LeaveBlocker";
import { modal } from "../../../components/Modal/Modal";
import { Space } from "../../../components/Space/Space";

type UnsavedChangesModalProps = {
  onSave: () => void;
  onCancel?: () => void;
  onDiscard?: () => void;
  cancelText?: string;
  discardText?: string;
  okText?: string;
  title?: string;
  body?: string;
};

export const unsavedChangesModal = ({
  onSave,
  onCancel,
  onDiscard,
  cancelText,
  discardText,
  okText,
  title = "You have unsaved changes.",
  body = "Would you like to save them before leaving?",
  ...props
}: UnsavedChangesModalProps) => {
  let modalInstance: any = undefined;
  const saveAndLeave = async () => {
    modalInstance?.update({ footer: getFooter(true) });
    await onSave?.();
    modalInstance?.update({ footer: getFooter(false) });
    modalInstance?.close();
  };
  const getFooter = (waiting: boolean) => {
    return (
      <Space align="end">
        <Button
          onClick={() => {
            onCancel?.();
            modalInstance?.close();
          }}
          size="compact"
          autoFocus
        >
          {cancelText ?? "Cancel"}
        </Button>

        {onDiscard && (
          <Button
            onClick={() => {
              onDiscard?.();
              modalInstance?.close();
            }}
            size="compact"
            look="danger"
          >
            {discardText ?? "Discard and leave"}
          </Button>
        )}

        <Button waiting={waiting} onClick={saveAndLeave} size="compact" look={"primary"}>
          {okText ?? "Save and leave"}
        </Button>
      </Space>
    );
  };
  modalInstance = modal({
    ...props,
    title,
    body,
    allowClose: true,
    footer: getFooter(false),
    style: { width: 512 },
  });
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
  const daveHandlerRef = useRef(onSave);
  daveHandlerRef.current = onSave;
  const blockHandler = useCallback(
    async ({ continueCallback, cancelCallback }: LeaveBlockerCallbacks) => {
      const wrappedOnSave = async () => {
        const result = await daveHandlerRef.current?.();
        if (result === true) {
          continueCallback && setTimeout(continueCallback, 0);
        } else {
          // We consider that user tries to save changes, but as long as there are some errors,
          // we just close the modal to allow user to see and fix them
          cancelCallback?.();
        }
      };

      unsavedChangesModal({
        onSave: wrappedOnSave,
        onCancel: cancelCallback,
        onDiscard: continueCallback,
      });
    },
    [onSave],
  );
  return <LeaveBlocker active={hasChanges} onBlock={blockHandler} />;
};
