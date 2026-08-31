import { BookOpenTextIcon } from "@humansignal/icons";
import { cnm } from "@humansignal/ui";
import { getCustomBadgeIconClass, getPresetAccentIconClass } from "./course-badge-colors";

const NEUTRAL_COLOR = "#FFFFFF";

function isCourseColorNeutral(color) {
  return !color || color.toUpperCase() === NEUTRAL_COLOR;
}

export function CourseListBadge({ color, className, iconClassName }) {
  const isNeutral = isCourseColorNeutral(color);
  const presetIconClass = getPresetAccentIconClass(color);
  const customIconClass = !isNeutral && !presetIconClass && color ? getCustomBadgeIconClass(color) : undefined;

  return (
    <div
      className={cnm(
        "flex shrink-0 items-center justify-center rounded-full h-6 w-6",
        isNeutral ? "bg-neutral-surface-inset" : "",
        className,
      )}
      style={!isNeutral ? { backgroundColor: color ?? undefined } : undefined}
      aria-hidden
    >
      <BookOpenTextIcon
        className={cnm(
          "h-4 w-4",
          isNeutral && "text-neutral-content-subtlest",
          presetIconClass,
          customIconClass,
          iconClassName,
        )}
        data-testid="course-list-badge-icon"
        aria-hidden
      />
    </div>
  );
}
