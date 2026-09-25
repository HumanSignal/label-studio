import type { SVGProps } from "react";
import {
  IconAnnotation,
  IconBanSquare,
  IconCommentCheck,
  IconCommentRed,
  IconSparkSquare,
  IconStarSquare,
  IconThumbsDown,
  IconThumbsUp,
} from "@humansignal/icons";

type ColumnIconProps = Pick<SVGProps<SVGSVGElement>, "width" | "height" | "className"> & {
  size?: number;
};

/**
 * Icons shown in Data Manager column headers for a small set of task metrics.
 * Same mapping as `TabColumn.icon` — keep Settings and the live grid in sync.
 */
export function getColumnIconByAlias(alias: string | null | undefined, props: ColumnIconProps = {}) {
  const { size, width = size ?? 20, height = size ?? 20, className } = props;

  switch (alias) {
    case "total_annotations":
      return <IconAnnotation width={width} height={height} className={className ?? "text-primary-icon"} />;
    case "cancelled_annotations":
      return <IconBanSquare width={width} height={height} className={className ?? "text-negative-icon"} />;
    case "total_predictions":
      return <IconSparkSquare width={width} height={height} className={className ?? "text-accent-plum-bold"} />;
    case "reviews_accepted":
      return <IconThumbsUp width={width} height={height} className={className ?? "text-positive-icon"} />;
    case "reviews_rejected":
      return <IconThumbsDown width={width} height={height} className={className ?? "text-negative-icon"} />;
    case "ground_truth":
      return <IconStarSquare width={width} height={height} className={className ?? "text-warning-icon"} />;
    case "comment_count":
      return <IconCommentCheck width={width} height={height} className={className ?? "text-warning-icon"} />;
    case "unresolved_comment_count":
      return <IconCommentRed width={width} height={height} className={className ?? "text-warning-icon"} />;
    default:
      return null;
  }
}
