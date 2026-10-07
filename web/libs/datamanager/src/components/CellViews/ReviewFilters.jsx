import { DatetimeFilter } from "../Filters/types/Datetime";
import { ListFilter } from "../Filters/types/List";
import { DateTimeCell } from "./DateTimeCell";
import { StringCell } from "./StringCell";

/**
 * Filter-only column: the cell is never rendered. Giving it custom operators lets the multi-select
 * read "is any of" / "is none of" instead of the plain "contains".
 */
export const ReviewsReviewResult = (cell) => StringCell(cell);
ReviewsReviewResult.filterable = true;
ReviewsReviewResult.customOperators = ListFilter;

/** `Reviews > Reviewed at` without "is empty": every review line matches reviews that exist. */
export const ReviewsReviewedAt = (cell) => DateTimeCell(cell);
ReviewsReviewedAt.filterable = true;
ReviewsReviewedAt.customOperators = DatetimeFilter;
