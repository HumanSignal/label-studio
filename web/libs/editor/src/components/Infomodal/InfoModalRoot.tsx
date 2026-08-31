import { useEffect, useState } from "react";
import { Button, Dialog, Message, Typography } from "@humansignal/ui";
import type { MessageVariant } from "@humansignal/ui/lib/message/message";
import { registerInfoModalDispatch, type InfoModalPayload, type InfoModalVariant } from "./infomodal-dispatch";

/** Maps legacy Infomodal API variants to `Message` variants (icons + surface colors). */
const INFO_MODAL_TO_MESSAGE_VARIANT: Record<InfoModalVariant, MessageVariant> = {
  error: "error",
  warning: "warning",
  success: "success",
  info: "info",
};

export function InfoModalRoot() {
  const [state, setState] = useState<InfoModalPayload | null>(null);

  useEffect(() => {
    registerInfoModalDispatch(setState);
    return () => registerInfoModalDispatch(null);
  }, []);

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) setState(null);
      }}
      title={state?.title ?? "Info"}
      size="small"
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
  );
}
