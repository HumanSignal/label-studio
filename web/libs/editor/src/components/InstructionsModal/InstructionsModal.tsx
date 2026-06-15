import { ModalWindow } from "@humansignal/ui";
import * as ff from "@humansignal/core/lib/utils/feature-flags";
import { Modal } from "antd";
import type React from "react";
import { sanitizeHtml } from "../../utils/html";
import "./InstructionsModal.prefix.css";

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
  const contentStyle: Record<string, string> = {
    padding: "0 24px 24px",
    whiteSpace: "pre-wrap",
    color: "var(--color-neutral-content)",
  };

  const body =
    typeof children === "string" ? (
      <div
        className="whitespace-pre-wrap pb-wide text-neutral-content"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(children) }}
      />
    ) : (
      <div className="whitespace-pre-wrap pb-wide">{children}</div>
    );

  if (ff.isActive(ff.FF_MODAL_WINDOW_APP_CHROME)) {
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
  }

  return (
    <>
      <Modal
        title=""
        open={visible}
        maskClosable
        footer={null}
        closable={true}
        onCancel={() => onCancel()}
        wrapClassName="lsf-instructions-modal"
        width="70%"
        style={{
          maxHeight: "calc(100vh - 250px)",
          minWidth: "400px",
          maxWidth: "800px",
          borderRadius: "8px",
          overflow: "hidden",
          padding: "0",
        }}
        bodyStyle={{
          overflow: "auto",
          maxHeight: "calc(100vh - 250px)",
          padding: "0px",
        }}
      >
        <h2
          style={{
            position: "sticky",
            top: "0px",
            background: "var(--color-neutral-background)",
            color: "var(--color-neutral-content)",
            padding: "24px 24px 20px",
            margin: "0px",
            fontWeight: "400",
            fontSize: "24",
          }}
        >
          {title}
        </h2>
        {typeof children === "string" ? (
          <p style={contentStyle} dangerouslySetInnerHTML={{ __html: sanitizeHtml(children) }} />
        ) : (
          <p style={contentStyle}>{children}</p>
        )}
      </Modal>
    </>
  );
};
