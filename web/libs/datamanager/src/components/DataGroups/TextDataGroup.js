import { format, isValid } from "date-fns";
import { dateTimeFormat } from "../CellViews/DateTimeCell";

export const valueToString = (value) => {
  if (typeof value === "string") return value;
  /* if undefined or null we'll treat it as empty string */
  if (value === undefined || value === null) return "";
  if (value instanceof Date && isValid(value)) return format(value, dateTimeFormat);

  try {
    /* JSON.stringify will handle JSON and non-strings, non-null, non-undefined */
    return JSON.stringify(value);
  } catch {
    return "Error: Invalid JSON";
  }
};

export const TextDataGroup = ({ value }) => {
  const output = valueToString(value);
  const style = {
    padding: 5,
    height: TextDataGroup.height,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };

  return (
    <div style={style} title={output}>
      {output}
    </div>
  );
};

TextDataGroup.height = 32;
