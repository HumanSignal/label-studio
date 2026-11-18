import { ModalWindow } from "@humansignal/ui";
import { type ComponentProps, useRef } from "react";
import { ErrorWrapper } from "./Error";

export type ErrorDialogContent = ComponentProps<typeof ErrorWrapper>;

type ErrorDialogProps = {
  /** The error to show, or null when there is none. */
  error: ErrorDialogContent | null;
  /** Called when the user closes the dialog. Without it the dialog cannot be dismissed. */
  onClose?: () => void;
  dataTestId?: string;
};

/** An error shown over the page, rendered by the component that caught it. */
export const ErrorDialog = ({ error, onClose, dataTestId = "error-dialog" }: ErrorDialogProps) => {
  // The last error stays on screen while the dialog fades out.
  const shown = useRef(error);
  if (error) shown.current = error;
  const content = shown.current;

  return (
    <ModalWindow
      open={error !== null}
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
      title={content?.title ?? "Error"}
      // The error body carries the title, so the header only holds the close button
      hideHeader={!onClose}
      header={onClose ? <span /> : undefined}
      showCloseButton={Boolean(onClose)}
      headerClassName="pb-0"
      placement="center"
      bodyClassName={onClose ? undefined : "p-wide"}
      closeOnScrimClick={Boolean(onClose)}
      dataTestId={dataTestId}
    >
      {content && <ErrorWrapper {...content} />}
    </ModalWindow>
  );
};
