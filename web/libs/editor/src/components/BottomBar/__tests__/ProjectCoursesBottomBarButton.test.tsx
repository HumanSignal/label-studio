import { cloneElement, useState } from "react";
import { fireEvent, render } from "@testing-library/react";
import { Provider } from "mobx-react";
import * as iconsModule from "@humansignal/icons";
import * as uiModule from "@humansignal/ui";
import { ProjectCoursesBottomBarButton } from "../ProjectCoursesBottomBarButton";

function MockDropdownTrigger({ children, content, onToggle }: any) {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    onToggle?.(nextOpen);
  };

  return (
    <>
      {cloneElement(children, {
        onClick: handleToggle,
        "aria-expanded": open,
      })}
      {open ? <div data-testid="project-courses-menu">{content}</div> : null}
    </>
  );
}

const createMockStore = (overrides: Record<string, unknown> = {}) => ({
  onDemandCourses: [],
  hideInstructionsForCourses: false,
  onOpenOnDemandCourse: mock(),
  hasInterface: mock(() => false),
  ...overrides,
});

describe("ProjectCoursesBottomBarButton", () => {
  beforeEach(() => {
    mock.clearAllMocks();

    spyOn(uiModule, "Button").mockImplementation(({ leading, children, onClick, ...props }: any) => (
      <button {...props} onClick={onClick}>
        {leading}
        {children}
      </button>
    ));
    spyOn(uiModule, "DropdownTrigger").mockImplementation(MockDropdownTrigger);
    spyOn(uiModule, "Tooltip").mockImplementation(({ children, disabled }: any) => (
      <div data-testid="project-courses-tooltip" data-tooltip-disabled={disabled ? "true" : "false"}>
        {children}
      </div>
    ));
    spyOn(uiModule, "Typography").mockImplementation(({ children }: any) => <span>{children}</span>);
    spyOn(uiModule, "useDropdown").mockImplementation(() => ({
      close: mock(),
    }));
    spyOn(iconsModule, "BookOpenTextIcon").mockImplementation(({ className, ...props }: any) => (
      <svg data-testid={className ? "course-list-badge-icon" : "book-icon"} className={className} {...props} />
    ));
  });

  test("renders when hideInstructionsForCourses is true and courses are present without learning:on-demand", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [{ id: 1, title: "Safety course", sortOrder: 0, color: "#539EEE" }],
    });

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    expect(getByTestId("bottombar-courses-button")).toBeInTheDocument();
    expect(mockStore.hasInterface).not.toHaveBeenCalled();
  });

  test("returns null when onDemandCourses is empty", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [],
    });

    const { queryByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    expect(queryByTestId("bottombar-courses-button")).not.toBeInTheDocument();
  });

  test("returns null when hideInstructionsForCourses is false", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: false,
      onDemandCourses: [{ id: 1, title: "Safety course", sortOrder: 0, color: null }],
    });

    const { queryByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    expect(queryByTestId("bottombar-courses-button")).not.toBeInTheDocument();
  });

  test("opens menu and calls onOpenOnDemandCourse when a course is selected", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [{ id: 42, title: "On demand course", sortOrder: 0, color: "#78B757" }],
    });

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    fireEvent.click(getByTestId("bottombar-courses-button"));
    fireEvent.click(getByTestId("project-courses-menu-item-42"));

    expect(mockStore.onOpenOnDemandCourse).toHaveBeenCalledWith(42);
  });

  test("renders colored badge for course with preset color", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [{ id: 5, title: "Colored course", sortOrder: 0, color: "#539EEE" }],
    });

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    fireEvent.click(getByTestId("bottombar-courses-button"));

    const badge = getByTestId("course-list-badge-icon");
    expect(badge.getAttribute("class")).toContain("text-accent-blueberry-subtlest");
  });

  test("sets aria-expanded on trigger when menu opens", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [{ id: 1, title: "Safety course", sortOrder: 0, color: null }],
    });

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    const trigger = getByTestId("bottombar-courses-button");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(getByTestId("project-courses-tooltip")).toHaveAttribute("data-tooltip-disabled", "true");
  });
});
