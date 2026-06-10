import { InfoIcon, SlidersHorizontalIcon } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { isStarterCloudPlan } from "@humansignal/core";
import { cn } from "../../utils/bem";
import { AutoAcceptToggle } from "../AnnotationTab/AutoAcceptToggle";
import { DynamicPreannotationsToggle } from "../AnnotationTab/DynamicPreannotationsToggle";
import { GroundTruth } from "../CurrentEntity/GroundTruth";
import { EditingHistory } from "./HistoryActions";
import { ProjectCoursesBottomBarButton } from "./ProjectCoursesBottomBarButton";
import "./Actions.prefix.css";

export const Actions = ({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore.selected;
  const isPrediction = entity?.type === "prediction";
  const isViewAll = annotationStore.viewingAll === true;
  const isBulkMode = !isStarterCloudPlan() && store.hasInterface("annotation:bulk");
  const hideInstructionsForCourses = store.hideInstructionsForCourses === true && !store.hasInterface("review");
  const showInstructions = store.description && store.hasInterface("instruction") && !hideInstructionsForCourses;

  return (
    <div className={cn("bottombar").elem("section").toClassName()}>
      {!isPrediction && !isViewAll && store.hasInterface("edit-history") && <EditingHistory entity={entity} />}

      <div className={cn("action-buttons").toClassName()}>
        <ProjectCoursesBottomBarButton store={store} />
        {showInstructions && (
          <Button
            type="text"
            aria-label="Instructions"
            size="small"
            variant="neutral"
            look="string"
            tooltip="Show instructions"
            onClick={() => store.toggleDescription()}
            className="aspect-square"
            leading={<InfoIcon size={24} />}
            data-testid="bottombar-instructions-button"
          />
        )}
        <Button
          type="text"
          aria-label="Settings"
          size="small"
          look="string"
          variant="neutral"
          onClick={() => store.toggleSettings()}
          tooltip="Settings"
          className="aspect-square"
          leading={<SlidersHorizontalIcon size={24} />}
          data-testid="bottombar-settings-button"
        />
      </div>

      {store.hasInterface("ground-truth") && !isBulkMode && <GroundTruth entity={entity} />}

      {!isViewAll && (
        <div className={cn("model-actions").toClassName()}>
          <DynamicPreannotationsToggle />
          <AutoAcceptToggle />
        </div>
      )}
    </div>
  );
};
