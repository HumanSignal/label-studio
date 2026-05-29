import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseAuth = mock();
const mockUpdateUser = mock();
const mockRefetchUser = mock();
const mockAvatarMutation = mock();
const mockToastShow = mock();
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
  useToast: () => ({
    show: mockToastShow,
  }),
}));

import { PersonalInfo } from "./PersonalInfo";

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

  it("requires the full basic profile before workforce users can save", async () => {
    setupUser(makeUser());
    setupRequiredFields(["first_name", "last_name", "phone"]);

    render(<PersonalInfo />);

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: "Mika" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Last Name, Phone are required.",
        }),
      );
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("marks missing required profile fields until they are filled", () => {
    setupUser(makeUser());
    setupRequiredFields(["first_name", "last_name", "phone"]);

    render(<PersonalInfo />);

    const firstName = screen.getByLabelText(/First Name/);
    const lastName = screen.getByLabelText(/Last Name/);
    const phone = screen.getByLabelText(/Phone/);

    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(lastName).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    for (const badge of screen.getAllByText("Required")) {
      expect(badge).toHaveAttribute("data-required-missing", "true");
    }

    fireEvent.change(firstName, { target: { value: "Mika" } });
    fireEvent.change(lastName, { target: { value: "Kim" } });
    fireEvent.change(phone, { target: { value: "+1 555 0100" } });

    expect(screen.getByLabelText(/First Name/)).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Last Name/)).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Phone/)).not.toHaveAttribute("aria-invalid", "true");
    for (const badge of screen.getAllByText("Required")) {
      expect(badge).not.toHaveAttribute("data-required-missing");
    }
  });
});
