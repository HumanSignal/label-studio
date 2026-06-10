import { fireEvent, render } from "@testing-library/react";
import { Provider } from "mobx-react";
import { ProjectCoursesBottomBarButton } from "../ProjectCoursesBottomBarButton";
import * as uiModule from "@humansignal/ui";
import * as iconsModule from "@humansignal/icons";

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
    spyOn(uiModule, "Button").mockImplementation(({ leading, onClick, ...props }: any) => (
      <button {...props} onClick={onClick}>
        {leading}
      </button>
    ));
    spyOn(uiModule, "Dialog").mockImplementation(({ children, open, footer }: any) =>
      open ? (
        <div data-testid="project-courses-modal">
          {children}
          {footer}
        </div>
      ) : null,
    );
    spyOn(uiModule, "Typography").mockImplementation(({ children }: any) => <span>{children}</span>);
    spyOn(iconsModule, "BookOpenTextIcon").mockImplementation(() => <svg data-testid="book-icon" />);
  });

  test("renders when hideInstructionsForCourses is true and courses are present without learning:on-demand", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [{ id: 1, title: "Safety course", sortOrder: 0 }],
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
      onDemandCourses: [{ id: 1, title: "Safety course", sortOrder: 0 }],
    });

    const { queryByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    expect(queryByTestId("bottombar-courses-button")).not.toBeInTheDocument();
  });

  test("opens modal and calls onOpenOnDemandCourse when a course is selected", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      onDemandCourses: [{ id: 42, title: "On demand course", sortOrder: 0 }],
    });

    const { getByTestId } = render(
      <Provider store={mockStore}>
        <ProjectCoursesBottomBarButton store={mockStore as any} />
      </Provider>,
    );

    fireEvent.click(getByTestId("bottombar-courses-button"));
    fireEvent.click(getByTestId("project-courses-modal-item-42"));

    expect(mockStore.onOpenOnDemandCourse).toHaveBeenCalledWith(42);
  });
});
