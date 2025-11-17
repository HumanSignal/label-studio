import { isDefined } from "../../utils/utils";
import { Badge } from "@humansignal/ui";
import { Tooltip } from "@humansignal/ui";

// Map state values to human-readable labels
export const stateLabels = {
  CREATED: "Created",
  ANNOTATION_IN_PROGRESS: "Annotating",
  ANNOTATION_COMPLETE: "Annotated",
  REVIEW_IN_PROGRESS: "In Review",
  REVIEW_COMPLETE: "Reviewed",
  ARBITRATION_NEEDED: "Needs Arbitration",
  ARBITRATION_IN_PROGRESS: "In Arbitration",
  ARBITRATION_COMPLETE: "Arbitrated",
  COMPLETED: "Done",
};

// Map state values to descriptions for tooltips
const stateDescriptions = {
  CREATED: "Task has been created and is ready for annotation",
  ANNOTATION_IN_PROGRESS: "Task is currently being annotated",
  ANNOTATION_COMPLETE: "Annotation has been completed",
  REVIEW_IN_PROGRESS: "Task is under review",
  REVIEW_COMPLETE: "Review has been completed",
  ARBITRATION_NEEDED: "Task requires arbitration due to disagreements",
  ARBITRATION_IN_PROGRESS: "Task is currently in arbitration",
  ARBITRATION_COMPLETE: "Arbitration has been completed",
  COMPLETED: "Task is fully complete",
};

// State color mapping following the 4-color system
// Grey: Initial states, Blue: In-progress, Yellow: Attention/Churn, Green: Terminal/Complete
export const STATE_COLORS = {
  // Grey - Initial
  CREATED: "grey",

  // Blue - In Progress
  ANNOTATION_IN_PROGRESS: "blue",
  REVIEW_IN_PROGRESS: "blue",
  ARBITRATION_IN_PROGRESS: "blue",

  // Yellow - Attention/Churn
  ARBITRATION_NEEDED: "yellow",

  // Green - Complete/Terminal
  ANNOTATION_COMPLETE: "green",
  REVIEW_COMPLETE: "green",
  ARBITRATION_COMPLETE: "green",
  COMPLETED: "green",
};

// Map colors to Tailwind CSS classes for chip styling
export const colorToClasses = {
  grey: "bg-neutral-emphasis border-neutral-border text-neutral-content",
  blue: "bg-primary-emphasis border-primary-border-subtlest text-primary-content",
  yellow: "bg-warning-emphasis border-warning-border-subtlest text-warning-content",
  green: "bg-positive-emphasis border-positive-border-subtlest text-positive-content",
};

export const TaskState = (cell) => {
  const { value } = cell;

  if (!isDefined(value) || value === null || value === "") {
    return null;
  }

  const label = stateLabels[value] || value;
  const description = stateDescriptions[value] || value;
  const color = STATE_COLORS[value] || "grey";
  const colorClasses = colorToClasses[color];

  return (
    <div className="flex items-center">
      <Tooltip title={description}>
        <span>
          <Badge className={colorClasses}>{label}</Badge>
        </span>
      </Tooltip>
    </div>
  );
};

TaskState.userSelectable = false;

TaskState.style = {
  minWidth: 140,
};
