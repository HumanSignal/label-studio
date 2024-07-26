import { Block, Elem } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import "./Agreement.scss";

const agreement = (p) => {
  if (!isDefined(p)) return "zero";
  if (p < 33) return "low";
  if (p < 66) return "medium";
  return "high";
};

const formatNumber = (num) => {
  const number = Number(num);

  if (num % 1 === 0) {
    return number;
  }
  return number.toFixed(2);
};

export const Agreement = (column) => {
  return (
    <Block name="agreement">
      <Elem name="score" mod={{ [agreement(column.value)]: true }}>
        {isDefined(column.value) ? `${formatNumber(column.value)}%` : ""}
      </Elem>
    </Block>
  );
};

Agreement.userSelectable = false;
