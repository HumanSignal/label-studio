import { isDefined } from "../../utils/utils";

const formatNumber = (num) => {
  const number = Number(num);

  if (num % 1 === 0) {
    return number;
  }
  return number.toFixed(3);
};

export const NumberCell = (column) => (isDefined(column.value) ? formatNumber(column.value) : "");

// NumberCell.userSelectable = false;
