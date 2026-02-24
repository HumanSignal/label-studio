import { Badge } from "@humansignal/ui";

const parseBoolean = (value) => {
  if ([true, 1, "true", "1", "yes"].includes(value) || !!value === true) {
    return true;
  }
  return false;
};

export const BooleanCell = (column) => {
  const boolValue = parseBoolean(column.value);

  if (boolValue === true) {
    return (
      <Badge variant="positive" shape="square">
        True
      </Badge>
    );
  }
  if (boolValue === false) {
    return (
      <Badge variant="negative" shape="square">
        False
      </Badge>
    );
  }

  return null;
};

BooleanCell.userSelectable = false;
