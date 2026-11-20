import { useEffect, useState } from "react";
import { Button, ConfirmDialog, Dialog, Message, Typography } from "@humansignal/ui";
import type { MessageVariant } from "@humansignal/ui";
import {
  registerConfirmModalDispatch,
  registerInfoModalDispatch,
  type ConfirmModalPayload,
  type InfoModalPayload,
  type InfoModalVariant,
} from "./infomodal-dispatch";

/** Maps legacy Infomodal API variants to `Message` variants (icons + surface colors). */
const INFO_MODAL_TO_MESSAGE_VARIANT: Record<InfoModalVariant, MessageVariant> = {
  error: "negative",
  warning: "warning",
  success: "positive",
  info: "primary",
};

export function InfoModalRoot() {
  const [state, setState] = useState<InfoModalPayload | null>(null);
  const [confirm, setConfirm] = useState<ConfirmModalPayload | null>(null);

  useEffect(() => {
    registerInfoModalDispatch(setState);
    registerConfirmModalDispatch(setConfirm);
    return () => {
      registerInfoModalDispatch(null);
      registerConfirmModalDispatch(null);
    };
  }, []);

  return (
    <>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.title}
        okText={confirm?.okText}
        onOk={confirm?.onOk}
        buttonLook="negative"
        allowClose
        dataTestId="editor-confirm-modal"
      >
        <Typography variant="body" size="medium" className="text-neutral-content">
          {confirm?.content}
        </Typography>
      </ConfirmDialog>
      <Dialog
        open={state !== null}
        onOpenChange={(open) => {
          if (!open) setState(null);
        }}
        title={state?.title ?? "Info"}
        size="small"
        closeOnFocusOutside={false}
        dataTestId="editor-info-modal"
        footer={
          <div className="flex w-full justify-end">
            <Button variant="primary" type="button" onClick={() => setState(null)} data-testid="editor-info-modal-ok">
              OK
            </Button>
          </div>
        }
      >
        {state ? (
          <Message
            variant={INFO_MODAL_TO_MESSAGE_VARIANT[state.variant]}
            size="small"
            data-testid="editor-info-modal-message"
          >
            <Typography variant="body" size="medium" className="whitespace-pre-wrap text-neutral-content">
              {state.content}
            </Typography>
          </Message>
        ) : null}
      </Dialog>
    </>
  );
}
