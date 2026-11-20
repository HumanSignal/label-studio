import { ModalWindow } from "@humansignal/ui";
import type React from "react";
import { sanitizeInstructionsHtml } from "../../utils/sanitizeHtml";

export const InstructionsModal = ({
  title,
  children,
  visible,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  visible: boolean;
  onCancel: () => void;
}) => {
  // The ModalWindow body below is p-0, so the content carries the side padding itself.
  const body =
    typeof children === "string" ? (
      <div
        className="whitespace-pre-wrap px-wide pb-wide text-neutral-content"
        dangerouslySetInnerHTML={{ __html: sanitizeInstructionsHtml(children) }}
      />
    ) : (
      <div className="whitespace-pre-wrap px-wide pb-wide">{children}</div>
    );

  return (
    <ModalWindow
      open={visible}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={title}
      size="larger"
      contentClassName="max-w-[800px]"
      bodyClassName="min-h-0 p-0"
      dataTestId="editor-instructions-modal"
    >
      {body}
    </ModalWindow>
  );
};
