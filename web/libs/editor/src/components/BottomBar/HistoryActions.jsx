import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import {
  ArrowCounterClockwiseIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  IconRedo,
  IconReset,
  IconUndo,
} from "@humansignal/icons";
import { Tooltip, Button } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import "./HistoryActions.prefix.css";

export const EditingHistory = observer(({ entity }) => {
  const { t } = useTranslation();
  const { history } = entity;

  return (
    <div className={cn("history-buttons").toClassName()}>
      <Tooltip title={t("editor:undo")}>
        <Button
          variant="neutral"
          size="small"
          aria-label={t("editor:undo")}
          look="string"
          disabled={!history?.canUndo}
          onClick={() => entity.undo()}
          className="aspect-square"
          leading={<ArrowUUpLeftIcon size={24} />}
          data-testid="bottombar-undo-button"
        />
      </Tooltip>
      <Tooltip title={t("editor:redo")}>
        <Button
          variant="neutral"
          size="small"
          look="string"
          aria-label={t("editor:redo")}
          disabled={!history?.canRedo}
          onClick={() => entity.redo()}
          className="aspect-square"
          leading={<ArrowUUpRightIcon size={24} />}
          data-testid="bottombar-redo-button"
        />
      </Tooltip>
      <Tooltip title={t("editor:reset")}>
        <Button
          variant="negative"
          look="string"
          size="small"
          aria-label={t("editor:reset")}
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
          className="aspect-square"
          leading={<ArrowCounterClockwiseIcon size={24} />}
          data-testid="bottombar-reset-button"
        />
      </Tooltip>
    </div>
  );
});
