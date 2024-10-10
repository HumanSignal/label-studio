import type { MouseEventHandler } from "react";

import { IconCommentLinkTo } from "../../../assets/icons";
import { ReactComponent as IconSend } from "../../../assets/icons/send.svg";
import { Tooltip } from "../../../common/Tooltip/Tooltip";
import { Block, Elem } from "../../../utils/bem";
const TOOLTIP_DELAY = 0.8;
import "./CommentFormButtons.scss";

export const CommentFormButtons = ({
  region,
  linking,
  onLinkTo,
}: { region: any; linking: boolean; onLinkTo?: MouseEventHandler<HTMLElement> }) => (
  <Block name="comment-form-buttons">
    <Elem name="buttons">
      {onLinkTo && !region && (
        <Tooltip title="Link to..." mouseEnterDelay={TOOLTIP_DELAY}>
          <Elem name="action" tag="button" mod={{ highlight: linking }} onClick={onLinkTo}>
            <IconCommentLinkTo />
          </Elem>
        </Tooltip>
      )}
      <Elem name="action" tag="button" type="submit">
        <IconSend />
      </Elem>
    </Elem>
  </Block>
);
