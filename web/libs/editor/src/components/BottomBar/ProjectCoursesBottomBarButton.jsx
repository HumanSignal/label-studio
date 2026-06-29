import { observer } from "mobx-react";
import { BookOpenTextIcon } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { ProjectCoursesMenu } from "./ProjectCoursesMenu";

export const ProjectCoursesBottomBarButton = observer(({ store }) => {
  const courses = store.onDemandCourses ?? [];

  if (store.hideInstructionsForCourses !== true || courses.length === 0) {
    return null;
  }

  const handleSelectCourse = (courseId) => {
    store.onOpenOnDemandCourse?.(courseId);
  };

  return (
    <ProjectCoursesMenu courses={courses} onSelectCourse={handleSelectCourse}>
      <Button
        type="text"
        aria-label="View project courses"
        size="small"
        variant="neutral"
        look="string"
        className="aspect-square"
        leading={<BookOpenTextIcon size={24} />}
        data-testid="bottombar-courses-button"
      />
    </ProjectCoursesMenu>
  );
});
