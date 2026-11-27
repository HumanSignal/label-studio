import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseAuth = mock();
const mockInvoke = mock();

mockModule("@humansignal/core/providers/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

mockModule("@humansignal/core", () => ({
  ...requireActual("@humansignal/core"),
  getApiInstance: () => ({
    invoke: mockInvoke,
  }),
}));

import { MembershipInfo } from "./MembershipInfo";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderComponent = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MembershipInfo />
    </QueryClientProvider>,
  );
};

describe("MembershipInfo", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockUseAuth.mockReturnValue({
      user: {
        id: 42,
        email: "viewer@example.com",
        active_organization: 10,
        date_joined: "2024-01-01T00:00:00Z",
        active_organization_meta: {
          title: "Test Org",
          email: "owner@example.com",
        },
      },
    });
  });

  it("displays View-Only role when member role is VO", async () => {
    mockInvoke.mockImplementation((endpoint: string) => {
      if (endpoint === "userMemberships") {
        return Promise.resolve({
          user: 42,
          organization: 10,
          contributed_projects_count: 0,
          annotations_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          role: "VO",
          $meta: { ok: true },
        });
      }
      return Promise.resolve({ $meta: { ok: false } });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("My role")).toBeInTheDocument();
    });

    expect(screen.getByText("View-Only")).toBeInTheDocument();
  });

  it("displays View-Only role when member user_type is viewonly", async () => {
    mockInvoke.mockImplementation((endpoint: string) => {
      if (endpoint === "userMemberships") {
        return Promise.resolve({
          user: 42,
          organization: 10,
          contributed_projects_count: 0,
          annotations_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          user_type: "viewonly",
          $meta: { ok: true },
        });
      }
      return Promise.resolve({ $meta: { ok: false } });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("My role")).toBeInTheDocument();
    });

    expect(screen.getByText("View-Only")).toBeInTheDocument();
  });

  it("displays Administrator when role is AD", async () => {
    mockInvoke.mockImplementation((endpoint: string) => {
      if (endpoint === "userMemberships") {
        return Promise.resolve({
          user: 42,
          organization: 10,
          contributed_projects_count: 1,
          annotations_count: 5,
          created_at: "2024-01-01T00:00:00Z",
          role: "AD",
          $meta: { ok: true },
        });
      }
      return Promise.resolve({ $meta: { ok: false } });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Administrator")).toBeInTheDocument();
    });
  });

  it("displays Owner when role is OW", async () => {
    mockInvoke.mockImplementation((endpoint: string) => {
      if (endpoint === "userMemberships") {
        return Promise.resolve({
          user: 42,
          organization: 10,
          contributed_projects_count: 2,
          annotations_count: 10,
          created_at: "2024-01-01T00:00:00Z",
          role: "OW",
          $meta: { ok: true },
        });
      }
      return Promise.resolve({ $meta: { ok: false } });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });
  });

  it("defaults to Owner when role is not provided (LSO compatibility)", async () => {
    mockInvoke.mockImplementation((endpoint: string) => {
      if (endpoint === "userMemberships") {
        return Promise.resolve({
          user: 42,
          organization: 10,
          contributed_projects_count: 0,
          annotations_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          $meta: { ok: true },
        });
      }
      return Promise.resolve({ $meta: { ok: false } });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });
  });
});
