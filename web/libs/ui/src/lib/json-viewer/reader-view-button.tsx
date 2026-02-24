import { type FC, useState } from "react";
import { IconBookOpenText } from "@humansignal/icons";
import { Button } from "../button/button";
import { Tooltip } from "../Tooltip/Tooltip";
import { ReaderViewModal } from "./reader-view-modal";

export interface ReaderViewButtonProps {
  nodeData: {
    key: string | number;
    value: any;
    path: (string | number)[];
  };
  threshold: number;
}

/**
 * ReaderViewButton - Custom button for json-edit-react
 *
 * Displays a button to open Reader View for long strings.
 * Only renders for string values exceeding the threshold.
 */
export const ReaderViewButton: FC<ReaderViewButtonProps> = ({ nodeData, threshold }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show button for strings exceeding threshold
  if (typeof nodeData.value !== "string" || nodeData.value.length <= threshold) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Tooltip title="Open Reader View">
        <Button
          look="string"
          onClick={handleClick}
          className="jer-edit-button"
          size="small"
          aria-label="Open Reader View"
          leading={<IconBookOpenText width={20} height={20} />}
        />
      </Tooltip>
      <ReaderViewModal content={nodeData.value} isOpen={isModalOpen} onClose={handleClose} />
    </>
  );
};
