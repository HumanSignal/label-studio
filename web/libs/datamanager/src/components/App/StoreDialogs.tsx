import { ConfirmDialog, type ConfirmDialogContent, InfoDialog, type InfoDialogProps } from "@humansignal/ui";
import { observer } from "mobx-react";

type PendingDialog =
  | { kind: "confirm"; content: ConfirmDialogContent }
  | { kind: "notice"; content: Omit<InfoDialogProps, "open" | "onOpenChange"> };

export interface StoreDialogsProps {
  store: {
    pendingDialog: PendingDialog | null;
    dismissDialog: (dialog: PendingDialog) => void;
  };
}

/**
 * Renders the confirmation or notice the store is asking for. Store actions and the SDK have no component
 * around them, so they park the dialog in `store.pendingDialog` and the Data Manager root shows it here.
 */
export const StoreDialogs = observer(({ store }: StoreDialogsProps) => {
  const dialog = store.pendingDialog;
  const dismiss = (open: boolean) => {
    if (!open && dialog) store.dismissDialog(dialog);
  };

  return (
    <>
      <ConfirmDialog
        {...(dialog?.kind === "confirm" ? dialog.content : null)}
        open={dialog?.kind === "confirm"}
        onOpenChange={dismiss}
      />
      <InfoDialog
        allowClose
        {...(dialog?.kind === "notice" ? dialog.content : null)}
        open={dialog?.kind === "notice"}
        onOpenChange={dismiss}
      />
    </>
  );
});
