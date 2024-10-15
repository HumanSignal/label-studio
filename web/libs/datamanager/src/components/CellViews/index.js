import { toStudlyCaps } from "strman";

export { Agreement } from "./Agreement/Agreement";
export {
  Annotators,
  Annotators as Reviewers,
  Annotators as UpdatedBy,
  Annotators as CommentAuthors,
} from "./Annotators/Annotators";
export { AudioCell as Audio, AudioPlusCell as AudioPlus } from "./AudioCell";
export { BooleanCell as Boolean } from "./BooleanCell";
export { DateTimeCell as Date, DateTimeCell as Datetime } from "./DateTimeCell";
export { ImageCell as Image } from "./ImageCell";
export { NumberCell as Number } from "./NumberCell";
export { StringCell as String } from "./StringCell";
export { StringCell as Text } from "./StringCell";
export { VideoCell as Video } from "./VideoCell";
export { ProjectCell as Project } from "./ProjectCell";

export function normalizeCellAlias(alias) {
  // remove trailing separators to make `toStudlyCaps` safe
  const safeAlias = alias.replace(/[-_\s]+$/g, "");

  return toStudlyCaps(safeAlias);
}
