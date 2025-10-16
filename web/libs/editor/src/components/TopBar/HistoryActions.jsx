import { observer } from "mobx-react";
import { IconRedo, IconRemove, IconUndo } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import "./HistoryActions.scss";

export const EditingHistory = observer(({ entity }) => {
  const { history } = entity;

  return (
    <div className={cn("history-buttons").toClassName()}>
      <Button
        variant="neutral"
        look="string"
        aria-label="Undo"
        className="!p-0"
        tooltip="Undo"
        disabled={!history?.canUndo}
        onClick={() => entity.undo()}
      >
        <IconUndo />
      </Button>
      <Button
        variant="neutral"
        look="string"
        aria-label="Redo"
        className="!p-0"
        tooltip="Redo"
        disabled={!history?.canRedo}
        onClick={() => entity.redo()}
        leading={<IconRedo />}
      />
      <Button
        look="string"
        variant="negative"
        aria-label="Reset"
        tooltip="Reset"
        className="!p-0"
        disabled={!history?.canUndo}
        onClick={() => history?.reset()}
        leading={<IconRemove />}
      />
    </div>
  );
});
