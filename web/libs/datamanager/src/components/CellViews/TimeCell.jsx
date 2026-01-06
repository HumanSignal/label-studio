import { formatTime } from "@humansignal/core";
import { isDefined } from "../../utils/utils";

export const TimeCell = (column) => (isDefined(column.value) ? formatTime(column.value) : "");
