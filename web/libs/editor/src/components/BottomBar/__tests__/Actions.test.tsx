import { render, screen } from "@testing-library/react";
import { Provider } from "mobx-react";
import { Actions } from "../Actions";
import * as uiModule from "@humansignal/ui";
import * as iconsModule from "@humansignal/icons";

mockModule("../HistoryActions", () => ({
  EditingHistory: () => null,
}));

mockModule("../../CurrentEntity/GroundTruth", () => ({
  GroundTruth: () => null,
}));

const createMockStore = (overrides: Record<string, unknown> = {}) => ({
  annotationStore: { selected: { type: "annotation", skipped: false }, viewingAll: false },
  description: "<p>Review instructions</p>",
  hideInstructionsForCourses: false,
  onDemandCourses: [],
  setAutoAnnotation: mock(),
  hasInterface: mock((name: string) => name === "instruction" || name === "review" || name === "edit-history"),
  toggleDescription: mock(),
  toggleSettings: mock(),
  ...overrides,
});

describe("Actions", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    spyOn(uiModule, "Button").mockImplementation(({ leading, onClick, ...props }: any) => (
      <button {...props} onClick={onClick}>
        {leading}
      </button>
    ));
    spyOn(iconsModule, "InfoIcon").mockImplementation(() => <svg data-testid="info-icon" />);
    spyOn(iconsModule, "SlidersHorizontalIcon").mockImplementation(() => <svg data-testid="settings-icon" />);
  });

  it("hides instructions toggle in review mode when hideInstructionsForCourses is true", () => {
    const mockStore = createMockStore({
      hideInstructionsForCourses: true,
      hasInterface: mock((name: string) => ["instruction", "review", "edit-history"].includes(name)),
    });

    render(
      <Provider store={mockStore}>
        <Actions store={mockStore as any} />
      </Provider>,
    );

    expect(screen.queryByTestId("bottombar-instructions-button")).not.toBeInTheDocument();
  });
});
