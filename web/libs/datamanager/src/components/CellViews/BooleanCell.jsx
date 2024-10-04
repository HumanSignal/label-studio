import { Tag } from "../Common/Tag/Tag";

const parseBoolean = (value) => {
  if ([true, 1, "true", "1", "yes"].includes(value) || !!value === true) {
    return true;
  }
  return false;
};

export const BooleanCell = (column) => {
  const boolValue = parseBoolean(column.value);

  if (boolValue === true) {
    return <Tag color="#80c70d">true</Tag>;
  }
  if (boolValue === false) {
    return <Tag color="#de3301">false</Tag>;
  }

  return null;
};

BooleanCell.userSelectable = false;
