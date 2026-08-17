import type { MouseEventHandler } from "react";
import { useTranslation } from "react-i18next";

import { IconCommentLinkTo, IconSend } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { cn } from "../../../utils/bem";
import "./CommentFormButtons.prefix.css";

export const CommentFormButtons = ({
  region,
  linking,
  onLinkTo,
}: {
  region: any;
  linking: boolean;
  onLinkTo?: MouseEventHandler<HTMLElement>;
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn("comment-form-buttons").toClassName()}>
      <div className={cn("comment-form-buttons").elem("buttons").toClassName()}>
        {onLinkTo && !region && (
          <Tooltip title={t("editor:linkTo")}>
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
};
