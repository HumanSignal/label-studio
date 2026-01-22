import { toStudlyCaps } from "@humansignal/core";

export { Agreement } from "./Agreement/Agreement";
export { AgreementSelected } from "./AgreementSelected";
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
export { TimeCell as Time } from "./TimeCell";
export { StringCell as Text } from "./StringCell";
export { VideoCell as Video } from "./VideoCell";
export { ProjectCell as Project } from "./ProjectCell";
export { TaskState } from "./TaskState";

export function normalizeCellAlias(alias) {
  // remove trailing separators to make `toStudlyCaps` safe
  const safeAlias = alias.replace(/[-_\s]+$/g, "");

  // Treat dimension agreement columns like the built-in agreement column
  // so they use the same percentage formatting and coloring.
  if (safeAlias === "agreement" || safeAlias.startsWith("dimension_agreement__")) {
    return "Agreement";
  }

  return toStudlyCaps(safeAlias);
}
