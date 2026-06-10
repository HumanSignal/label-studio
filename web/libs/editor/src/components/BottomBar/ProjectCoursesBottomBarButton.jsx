import { useState } from "react";
import { observer } from "mobx-react";
import { BookOpenTextIcon } from "@humansignal/icons";
import { Button, Dialog, Typography } from "@humansignal/ui";
import "./ProjectCoursesBottomBarButton.prefix.css";

export const ProjectCoursesBottomBarButton = observer(({ store }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const courses = store.onDemandCourses ?? [];

  if (store.hideInstructionsForCourses !== true || courses.length === 0) {
    return null;
  }

  const handleSelectCourse = (courseId) => {
    setModalOpen(false);
    store.onOpenOnDemandCourse?.(courseId);
  };

  return (
    <>
      <Button
        type="text"
        aria-label="View project courses"
        size="small"
        variant="neutral"
        look="string"
        tooltip="View Project Course(s)"
        onClick={() => setModalOpen(true)}
        className="aspect-square"
        leading={<BookOpenTextIcon size={24} />}
        data-testid="bottombar-courses-button"
      />
      <Dialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Project courses"
        size="small"
        dataTestId="project-courses-modal"
        footer={
          <div className="flex w-full justify-end">
            <Button
              variant="neutral"
              look="outlined"
              onClick={() => setModalOpen(false)}
              data-testid="project-courses-modal-close"
            >
              Close
            </Button>
          </div>
        }
      >
        <ul className="project-courses-modal__list">
          {courses.map((course) => (
            <li key={course.id}>
              <button
                type="button"
                className="project-courses-modal__course-button"
                onClick={() => handleSelectCourse(course.id)}
                data-testid={`project-courses-modal-item-${course.id}`}
              >
                <Typography variant="body" size="medium">
                  {course.title}
                </Typography>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
});
