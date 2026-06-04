import { render, screen } from "@testing-library/react";
import * as PersonalInfoModule from "./PersonalInfo";
import * as UnsavedChangesModule from "apps/labelstudio/src/pages/CreateProject/Config/UnsavedChanges";
import { useReportProfileDirty } from "../ProfileDirtyContext";

const mockGetProfileExtras = mock(() => [] as React.FC[]);

mockModule("../extensions", () => ({
  getAccountSettingsProfileExtras: () => mockGetProfileExtras(),
}));

import { Profile } from "./Profile";

const DirtyExtra = () => {
  useReportProfileDirty(true);
  return <div>Dirty Extra Card</div>;
};

describe("Profile", () => {
  beforeEach(() => {
    mockGetProfileExtras.mockReset();
    mockGetProfileExtras.mockReturnValue([]);
    // Stub PersonalInfo via spyOn (auto-restored by the test preload's
    // afterEach) instead of mock.module, which would otherwise leak the stub
    // into PersonalInfo.test.tsx and other files sharing the Bun worker.
    spyOn(PersonalInfoModule, "PersonalInfo").mockImplementation(() => <div>Personal Info Form</div>);
    // The real UnsavedChanges pulls in LeaveBlocker (react-router `history.block`) and the modal stack,
    // which need a Router host and `getUserConfirmation` wiring. Spy on it with a probe that surfaces the
    // `hasChanges` prop so we can assert the page-level guard reflects aggregate dirty state. spyOn is
    // auto-restored per test, so it won't leak into other files sharing the Bun worker like mock.module would.
    spyOn(UnsavedChangesModule, "UnsavedChanges").mockImplementation((props) => (
      <div data-testid="unsaved-guard" data-has-changes={String(props.hasChanges)} />
    ));
  });

  it("renders the personal info form", () => {
    render(<Profile />);

    expect(screen.getByText("Personal Info Form")).toBeInTheDocument();
  });

  it("renders no extra cards when nothing is registered", () => {
    render(<Profile />);

    expect(screen.queryByText("Registered Extra Card")).not.toBeInTheDocument();
  });

  it("renders registered profile extras (e.g. the enterprise contributor profile)", () => {
    mockGetProfileExtras.mockReturnValue([() => <div>Registered Extra Card</div>]);

    render(<Profile />);

    expect(screen.getByText("Personal Info Form")).toBeInTheDocument();
    expect(screen.getByText("Registered Extra Card")).toBeInTheDocument();
  });

  it("keeps the unsaved-changes guard inactive when no form is dirty", () => {
    render(<Profile />);

    expect(screen.getByTestId("unsaved-guard")).toHaveAttribute("data-has-changes", "false");
  });

  it("activates the unsaved-changes guard when a profile form reports unsaved changes", () => {
    mockGetProfileExtras.mockReturnValue([DirtyExtra]);

    render(<Profile />);

    expect(screen.getByText("Dirty Extra Card")).toBeInTheDocument();
    expect(screen.getByTestId("unsaved-guard")).toHaveAttribute("data-has-changes", "true");
  });
});
