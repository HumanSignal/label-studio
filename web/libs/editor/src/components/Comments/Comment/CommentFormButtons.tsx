import type { MouseEventHandler } from "react";

import { IconCommentLinkTo, IconSend } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { cn } from "../../../utils/bem";
import "./CommentFormButtons.scss";

export const CommentFormButtons = ({
  region,
  linking,
  onLinkTo,
}: { region: any; linking: boolean; onLinkTo?: MouseEventHandler<HTMLElement> }) => (
  <div className={cn("comment-form-buttons").toClassName()}>
    <div className={cn("comment-form-buttons").elem("buttons").toClassName()}>
      {onLinkTo && !region && (
        <Tooltip title="Link to...">
          <button
            type="button"
            className={cn("comment-form-buttons").elem("action").mod({ highlight: linking }).toClassName()}
            onClick={onLinkTo}
          >
            <IconCommentLinkTo />
          </button>
        </Tooltip>
      )}
      <button type="submit" className={cn("comment-form-buttons").elem("action").toClassName()}>
        <IconSend />
      </button>
    </div>
  </div>
);
