import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseAuth = mock();
const mockUpdateUser = mock();
const mockRefetchUser = mock();
const mockAvatarMutation = mock();
const mockToastShow = mock();
const mockToast = { show: mockToastShow };
const mockUseAccountSettingsExtension = mock(() => ({ requiredProfileFields: [] as string[] }));

mockModule("@humansignal/core/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

mockModule("../extensions", () => ({
  useAccountSettingsExtension: () => mockUseAccountSettingsExtension(),
}));

const setupRequiredFields = (requiredProfileFields: string[]) =>
  mockUseAccountSettingsExtension.mockReturnValue({ requiredProfileFields });

// Mock only the mutation-atom factory, returning a real jotai atom that holds
// the mock. This keeps the real `jotai` module (and `useAtomValue`) intact.
// Globally mocking `jotai` leaks across files under Bun (module mocks are not
// restored between files) and breaks unrelated tests, e.g. playground's
// PlaygroundApp.test.tsx where `useAtomValue(displayModeAtom)` then returns a
// non-string and `displayMode.startsWith` throws.
mockModule("jotai-tanstack-query", () => ({
  atomWithMutation: () => requireActual("jotai").atom({ mutateAsync: mockAvatarMutation }),
}));

mockModule("@humansignal/ui", () => ({
  ...requireActual("@humansignal/ui"),
  useToast: () => mockToast,
}));

import { PersonalInfo } from "./PersonalInfo";
import { ProfileDirtyProvider, useDiscardProfileDrafts, useProfileFormsDirty } from "../ProfileDirtyContext";

const DirtyReadout = () => {
  const anyDirty = useProfileFormsDirty();
  return <div data-testid="readout">{anyDirty ? "dirty" : "clean"}</div>;
};

const DiscardButton = () => {
  const discard = useDiscardProfileDrafts();
  return <button onClick={discard}>Discard profile changes</button>;
};

const makeUser = (overrides = {}) => ({
  id: 1,
  email: "mika@example.com",
  first_name: "",
  last_name: "",
  phone: "",
  social_accounts: [],
  ...overrides,
});

const setupUser = (user: Record<string, unknown>) => {
  mockUseAuth.mockReturnValue({
    user,
    refetch: mockRefetchUser,
    isLoading: false,
    update: mockUpdateUser,
  });
};

describe("PersonalInfo", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUpdateUser.mockReset();
    mockRefetchUser.mockReset();
    mockAvatarMutation.mockReset();
    mockToastShow.mockReset();
    mockUpdateUser.mockImplementation(async () => ({ $meta: { ok: true } }));
    mockAvatarMutation.mockImplementation(async () => ({ $meta: { ok: true } }));
    setupRequiredFields([]);
  });

  afterAll(() => {
    mockUseAuth.mockReset();
    mockUpdateUser.mockReset();
    mockRefetchUser.mockReset();
    mockAvatarMutation.mockReset();
    mockToastShow.mockReset();
  });

  it("keeps basic profile fields optional for regular users", async () => {
    setupUser(makeUser());

    render(<PersonalInfo />);

    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Mika" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "Mika",
          last_name: "",
          phone: "",
        }),
      );
    });
  });

  it("shows under-field errors when required profile fields are missing", async () => {
    setupUser(makeUser());
    setupRequiredFields(["first_name", "last_name", "phone"]);

    render(<PersonalInfo />);

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Mika" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement);

    expect(await screen.findByText("Last Name is required.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Phone is required.")).toHaveAttribute("role", "alert");
    expect(screen.queryByText("First Name is required.")).not.toBeInTheDocument();
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("does not flag required fields before the user attempts to save", () => {
    setupUser(makeUser());
    setupRequiredFields(["first_name", "last_name", "phone"]);

    render(<PersonalInfo />);

    expect(screen.getByLabelText(/First Name/)).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/Last Name/)).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/Phone/)).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("First Name is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Name is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone is required.")).not.toBeInTheDocument();
    for (const badge of screen.getAllByText("Required")) {
      expect(badge).not.toHaveAttribute("data-required-missing");
    }

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Mika" } });
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "" } });

    expect(screen.getByLabelText(/First Name/)).not.toHaveAttribute("aria-invalid");
    for (const badge of screen.getAllByText("Required")) {
      expect(badge).not.toHaveAttribute("data-required-missing");
    }
  });

  it("flags missing required fields after a save attempt and clears them once filled", async () => {
    setupUser(makeUser());
    setupRequiredFields(["first_name", "last_name", "phone"]);

    render(<PersonalInfo />);

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Mika" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement);

    expect(await screen.findByText("Last Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Phone is required.")).toBeInTheDocument();
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();

    expect(screen.getByLabelText(/First Name/)).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/Last Name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Phone/)).toHaveAttribute("aria-invalid", "true");
    // Badges never react to validation state.
    for (const badge of screen.getAllByText("Required")) {
      expect(badge).not.toHaveAttribute("data-required-missing");
    }

    fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "Kim" } });
    fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: "+1 555 0100" } });

    expect(screen.getByLabelText(/Last Name/)).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText(/Phone/)).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByText("Last Name is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone is required.")).not.toBeInTheDocument();
  });

  describe("unsaved changes", () => {
    const renderWithReadout = () =>
      render(
        <ProfileDirtyProvider>
          <PersonalInfo />
          <DirtyReadout />
        </ProfileDirtyProvider>,
      );

    it("reports no unsaved changes when fields match the saved user", () => {
      setupUser(makeUser({ first_name: "Mika", last_name: "Kim", phone: "+1 555 0100" }));

      renderWithReadout();

      expect(screen.getByTestId("readout")).toHaveTextContent("clean");
    });

    it("reports unsaved changes after editing a field", () => {
      setupUser(makeUser({ first_name: "Mika" }));

      renderWithReadout();

      expect(screen.getByTestId("readout")).toHaveTextContent("clean");

      fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Mika Updated" } });

      expect(screen.getByTestId("readout")).toHaveTextContent("dirty");
    });

    it("is clean again when an edited field is reverted to the saved value", () => {
      setupUser(makeUser({ first_name: "Mika" }));

      renderWithReadout();

      const firstName = screen.getByLabelText(/First Name/);
      fireEvent.change(firstName, { target: { value: "Mika Updated" } });
      expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

      fireEvent.change(firstName, { target: { value: "Mika" } });
      expect(screen.getByTestId("readout")).toHaveTextContent("clean");
    });

    it("discards edited account details back to the saved user values", () => {
      setupUser(makeUser({ first_name: "Mika", last_name: "Kim", phone: "+1 555 0100" }));

      render(
        <ProfileDirtyProvider>
          <PersonalInfo />
          <DirtyReadout />
          <DiscardButton />
        </ProfileDirtyProvider>,
      );

      fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Mika Updated" } });
      fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: "" } });
      expect(screen.getByTestId("readout")).toHaveTextContent("dirty");

      fireEvent.click(screen.getByRole("button", { name: "Discard profile changes" }));

      expect(screen.getByLabelText(/First Name/)).toHaveValue("Mika");
      expect(screen.getByLabelText(/Last Name/)).toHaveValue("Kim");
      expect(screen.getByLabelText(/Phone/)).toHaveValue("+1 555 0100");
      expect(screen.getByTestId("readout")).toHaveTextContent("clean");
    });
  });

  describe("validation state", () => {
    it("clears attempted-save validation when profile changes are discarded", async () => {
      setupUser(makeUser({ first_name: "Mika", last_name: "Kim", phone: "+1 555 0100" }));
      setupRequiredFields(["first_name", "last_name", "phone"]);

      render(
        <ProfileDirtyProvider>
          <PersonalInfo />
          <DiscardButton />
        </ProfileDirtyProvider>,
      );

      fireEvent.change(screen.getByLabelText(/Last Name/), { target: { value: "" } });
      fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement);

      expect(await screen.findByText("Last Name is required.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Discard profile changes" }));

      expect(screen.getByLabelText(/Last Name/)).toHaveValue("Kim");
      expect(screen.queryByText("Last Name is required.")).not.toBeInTheDocument();
    });
  });
});
