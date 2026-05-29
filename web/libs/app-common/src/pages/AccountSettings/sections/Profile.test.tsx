import { render, screen } from "@testing-library/react";
import * as PersonalInfoModule from "./PersonalInfo";

const mockGetProfileExtras = mock(() => [] as React.FC[]);

mockModule("../extensions", () => ({
  getAccountSettingsProfileExtras: () => mockGetProfileExtras(),
}));

import { Profile } from "./Profile";

describe("Profile", () => {
  beforeEach(() => {
    mockGetProfileExtras.mockReset();
    mockGetProfileExtras.mockReturnValue([]);
    // Stub PersonalInfo via spyOn (auto-restored by the test preload's
    // afterEach) instead of mock.module, which would otherwise leak the stub
    // into PersonalInfo.test.tsx and other files sharing the Bun worker.
    spyOn(PersonalInfoModule, "PersonalInfo").mockImplementation(() => <div>Personal Info Form</div>);
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
});
