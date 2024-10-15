import { format, isValid } from "date-fns";
export const dateTimeFormat = "MMM dd yyyy, HH:mm:ss";

export const DateTimeCell = (column) => {
  const date = new Date(column.value);

  return column.value ? (
    <div style={{ whiteSpace: "nowrap" }}>{isValid(date) ? format(date, dateTimeFormat) : ""}</div>
  ) : (
    ""
  );
};

DateTimeCell.displayType = false;
