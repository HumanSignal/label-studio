import { Badge } from "@humansignal/ui";
import { BooleanFilter } from "../Filters/types/Boolean";

const parseBoolean = (value) => {
  if ([true, 1, "true", "1", "yes"].includes(value) || !!value === true) {
    return true;
  }
  return false;
};

export const BooleanCell = (column) => {
  const boolValue = parseBoolean(column.value);

  if (boolValue === true) {
    return <Badge variant="positive">True</Badge>;
  }
  if (boolValue === false) {
    return <Badge variant="negative">False</Badge>;
  }

  return null;
};

BooleanCell.userSelectable = false;

/**
 * Ground Truth column / child filter (FIT-2525).
 * Same badge rendering as Boolean, but without shared "is empty" — the flag is
 * never null (task Exists annotation or Annotation.ground_truth BooleanField).
 */
export const GroundTruth = (column) => BooleanCell(column);
GroundTruth.userSelectable = false;
GroundTruth.customOperators = BooleanFilter;
