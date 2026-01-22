import { isDefined } from "../../utils/utils";
import { TaskStateChip } from "@humansignal/app-common";

export const TaskState = (cell) => {
  const { value, original } = cell;

  if (!isDefined(value) || value === null || value === "") {
    return null;
  }

  // Extract task ID from the original row data
  const taskId = original?.id;

  return (
    <div className="flex items-center">
      <TaskStateChip state={value} taskId={taskId} interactive={!!taskId} />
    </div>
  );
};

TaskState.userSelectable = false;

TaskState.style = {
  minWidth: 140,
};
