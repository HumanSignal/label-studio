import { format, isValid } from "date-fns";

export const DateTimeCell = (column) => {
  const date = new Date(column.value);
  const dateFormat = "MMM dd yyyy, HH:mm:ss";

  return column.value ? (
    <div style={{ whiteSpace: "nowrap" }}>
      {isValid(date) ? format(date, dateFormat) : ""}
    </div>
  ) : (
    ""
  );
};

DateTimeCell.displayType = false;
