import { cloneElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { DropdownTrigger, Tooltip, Typography } from "@humansignal/ui";
import { Menu } from "../../common/Menu/Menu";
import { CourseListBadge } from "./CourseListBadge";
import styles from "./project-courses-menu.module.css";

/**
 * @typedef {{ id: number, title: string, color?: string | null }} OnDemandCourseItem
 */

/**
 * @param {{
 *   courses: OnDemandCourseItem[],
 *   onSelectCourse: (courseId: number) => void,
 * }} props
 */
function ProjectCoursesMenuContent({ courses, onSelectCourse }) {
  const { t } = useTranslation();

  if (courses.length === 0) {
    return (
      <Typography variant="body" size="medium" className="text-neutral-content-subtle p-tight">
        {t("editor:noCoursesAvailable")}
      </Typography>
    );
  }

  return (
    <Menu
      closeDropdownOnItemClick
      className={styles.projectCoursesMenu}
      role="menu"
      aria-label={t("editor:projectCourses")}
    >
      {courses.map((course) => (
        <Menu.Item
          key={course.id}
          icon={<CourseListBadge color={course.color} />}
          onClick={() => onSelectCourse(course.id)}
          data-testid={`project-courses-menu-item-${course.id}`}
        >
          <span className={styles.courseItemLabel} title={course.title}>
            {course.title}
          </span>
        </Menu.Item>
      ))}
    </Menu>
  );
}

/**
 * @param {{
 *   courses: OnDemandCourseItem[],
 *   onSelectCourse: (courseId: number) => void,
 *   children: React.ReactElement,
 * }} props
 */
export function ProjectCoursesMenu({ courses, onSelectCourse, children }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const trigger = cloneElement(children, {
    "aria-expanded": open,
  });

  return (
    <Tooltip title={t("editor:viewProjectCourses")} disabled={open}>
      <span className="inline-flex aspect-square">
        <DropdownTrigger
          alignment="top-center"
          constrainHeight
          dataTestId="project-courses-menu"
          onToggle={setOpen}
          content={<ProjectCoursesMenuContent courses={courses} onSelectCourse={onSelectCourse} />}
        >
          {trigger}
        </DropdownTrigger>
      </span>
    </Tooltip>
  );
}
