import { type FC, useCallback, useState } from "react";
import { IconCopyOutline } from "@humansignal/icons";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import { formatNodeClipboardText } from "./virtualized-json-viewer-utils";

export type CopyNodeButtonProps = {
  value: unknown;
};

export const CopyNodeButton: FC<CopyNodeButtonProps> = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      navigator.clipboard.writeText(formatNodeClipboardText(value)).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      });
    },
    [value],
  );

  return (
    <Tooltip title={copied ? "Copied!" : "Copy value"}>
      <Button
        look="string"
        onClick={handleClick}
        className="jer-edit-button"
        size="small"
        aria-label="Copy value"
        leading={<IconCopyOutline width={20} height={20} />}
      />
    </Tooltip>
  );
};
