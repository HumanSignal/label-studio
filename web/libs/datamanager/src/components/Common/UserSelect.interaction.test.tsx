import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useDataManagerUsers } from "../../hooks/useUsers";
import { UserSelect } from "./UserSelect";

const users = {
  mattOne: {
    id: 1,
    username: "matt-one",
    first_name: "Matt",
    last_name: "One",
    email: "matt.one@example.test",
  },
  mattTwo: {
    id: 2,
    username: "matt-two",
    first_name: "Matt",
    last_name: "Two",
    email: "matt.two@example.test",
  },
  other: {
    id: 3,
    username: "other",
    first_name: "Other",
    last_name: "User",
    email: "other@example.test",
  },
  reviewer: {
    id: 4,
    username: "reviewer",
    first_name: "Review",
    last_name: "User",
    email: "reviewer@example.test",
  },
};

let originalScrollIntoView: typeof Element.prototype.scrollIntoView;

beforeEach(() => {
  originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = mock();
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  window.DM = undefined;
});

describe("Data Manager user multi-select search", () => {
  it("requests project user options with a context-independent column scope", async () => {
    const requests: Array<{ method: string; params: Record<string, unknown> }> = [];
    const apiCall = mock((method: string, params: Record<string, unknown>) => {
      requests.push({ method, params });
      return Promise.resolve({ results: [users.mattOne], count: 1 });
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserSelect
          filter={{
            view: { project: { id: 42 } },
            field: { id: "tasks:annotators", alias: "annotators" },
          }}
          multiple={true}
          value={[]}
          onChange={() => {}}
          placeholder="Select annotators"
        />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(requests.some(({ method }) => method === "projectUsers")).toBe(true));
    const request = requests.find(({ method }) => method === "projectUsers");

    expect(request?.params).toEqual(
      expect.objectContaining({
        project: 42,
        column: "annotators",
      }),
    );
    expect(request?.params.column).toBe("annotators");
    expect(request?.params).not.toHaveProperty("is_child_filter");
    expect(JSON.stringify(request?.params)).not.toContain("tasks:annotators");
    // Guard merge regressions: column must be in the React Query key (not isDeleted/role).
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .map(({ queryKey }) => queryKey),
    ).toEqual(expect.arrayContaining([expect.arrayContaining(["projectUsers", 42, "annotators", 10])]));
  });

  it("keeps the remaining matching user visible after selecting one", async () => {
    const methods: string[] = [];
    const requests: Array<Record<string, unknown>> = [];
    const apiCall = mock((method: string, params: Record<string, unknown>) => {
      methods.push(method);
      requests.push(params);
      const results = params.search === "matt" ? [users.mattOne, users.mattTwo] : [users.other];
      return Promise.resolve(Object.assign(results, { count: results.length }));
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });

    const ControlledUserSelect = () => {
      const [value, setValue] = useState<number[]>([]);
      return (
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={value}
          onChange={(nextValue: number[]) => setValue(nextValue)}
          placeholder="Select annotators"
        />
      );
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ControlledUserSelect />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select annotators" }));
    fireEvent.change(await screen.findByTestId("select-search-field"), { target: { value: "matt" } });
    await waitFor(() => expect(requests.some((request) => request.search === "matt")).toBe(true));
    await screen.findByTestId("select-option-1");
    await screen.findByTestId("select-option-2");

    const requestCountBeforeSelection = requests.length;
    fireEvent.click(screen.getByTestId("select-option-1"));
    await waitFor(() => expect(requests.length).toBeGreaterThan(requestCountBeforeSelection));

    const requestAfterSelection = requests.at(-1);

    expect(requestAfterSelection?.search).toBe("matt");
    expect(new Set(methods)).toEqual(new Set(["projectUsers"]));
    await waitFor(() => expect(screen.getByTestId("select-option-2")).toBeInTheDocument());
    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
  });

  it("keeps every preselected user in the selected group while searching", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const allUsers = [users.mattOne, users.mattTwo, users.other, users.reviewer];
    const selectedIds = allUsers.map(({ id }) => id);
    const apiCall = mock((_method: string, params: Record<string, unknown>) => {
      requests.push(params);
      const results = params.search === "matt" ? [users.mattOne, users.mattTwo] : allUsers;
      return Promise.resolve({ results, count: results.length });
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });
    queryClient.setQueryData(["projectUsers", 42, undefined, 10, null, selectedIds], {
      pages: [{ results: allUsers, count: allUsers.length }],
      pageParams: [undefined],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={selectedIds}
          onChange={() => {}}
          placeholder="Select annotators"
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Matt One/ }));
    fireEvent.change(screen.getByTestId("select-search-field"), { target: { value: "matt" } });
    await waitFor(() => expect(requests.some((request) => request.search === "matt")).toBe(true));

    expect((await screen.findByRole("button", { name: /Selected items group/ })).getAttribute("aria-label")).toBe(
      "Selected items group, 4 items selected",
    );
    expect(
      requests.some(
        (request) =>
          !request.search &&
          Array.isArray(request.selected_value) &&
          [users.other.id, users.reviewer.id].every((id) => (request.selected_value as number[]).includes(id)),
      ),
    ).toBe(true);
    expect(screen.getByTestId("select-option-1")).toBeInTheDocument();
    expect(screen.getByTestId("select-option-2")).toBeInTheDocument();
    expect(screen.queryByTestId("select-option-3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("select-option-4")).not.toBeInTheDocument();
  });

  it("keeps current search results visible while a selection request is pending", async () => {
    let resolveSelectionRequest: (() => void) | undefined;
    const apiCall = mock((_method: string, params: Record<string, unknown>) => {
      const response = { results: [users.mattOne, users.mattTwo], count: 2 };
      if (Array.isArray(params.selected_value) && params.selected_value.length > 0) {
        return new Promise((resolve) => {
          resolveSelectionRequest = () => resolve(response);
        });
      }
      return Promise.resolve(response);
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });

    const ControlledUserSelect = () => {
      const [value, setValue] = useState<number[]>([]);
      return (
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={value}
          onChange={(nextValue: number[]) => setValue(nextValue)}
          placeholder="Select annotators"
        />
      );
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ControlledUserSelect />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select annotators" }));
    fireEvent.change(await screen.findByTestId("select-search-field"), { target: { value: "matt" } });
    await screen.findByTestId("select-option-2");
    fireEvent.click(screen.getByTestId("select-option-1"));
    await waitFor(() => expect(resolveSelectionRequest).toBeDefined());

    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
    expect(screen.getByTestId("select-option-2")).toBeInTheDocument();

    resolveSelectionRequest?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Selected items group/ })).toHaveAttribute(
        "aria-label",
        "Selected items group, 1 items selected",
      ),
    );
  });

  it("keeps current search results visible while an unselection request is pending", async () => {
    let shouldDeferRequest = false;
    let resolveUnselectionRequest: (() => void) | undefined;
    const apiCall = mock((_method: string, params: Record<string, unknown>) => {
      const response = { results: [users.mattOne, users.mattTwo], count: 2 };
      if (shouldDeferRequest && params.search === "matt" && !params.selected_value) {
        shouldDeferRequest = false;
        return new Promise((resolve) => {
          resolveUnselectionRequest = () => resolve(response);
        });
      }
      return Promise.resolve(response);
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });

    const ControlledUserSelect = () => {
      const [value, setValue] = useState<number[]>([users.mattOne.id]);
      return (
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={value}
          onChange={(nextValue: number[]) => setValue(nextValue)}
          placeholder="Select annotators"
        />
      );
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ControlledUserSelect />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Matt One/ }));
    fireEvent.change(await screen.findByTestId("select-search-field"), { target: { value: "matt" } });
    await screen.findByTestId("select-option-2");
    shouldDeferRequest = true;
    fireEvent.click(screen.getByTestId("select-option-1"));
    await waitFor(() => expect(resolveUnselectionRequest).toBeDefined());

    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
    expect(screen.getByTestId("select-option-2")).toBeInTheDocument();

    resolveUnselectionRequest?.();
    await waitFor(() => expect(screen.queryByRole("button", { name: /Selected items group/ })).not.toBeInTheDocument());
  });

  it("shows loading feedback instead of an empty state during the initial request", async () => {
    let resolveInitialRequest: (() => void) | undefined;
    const apiCall = mock(
      () =>
        new Promise((resolve) => {
          resolveInitialRequest = () => resolve({ results: [users.mattOne, users.mattTwo], count: 2 });
        }),
    );
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={[]}
          onChange={() => {}}
          placeholder="Select annotators"
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select annotators" }));
    await waitFor(() => expect(resolveInitialRequest).toBeDefined());

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();

    resolveInitialRequest?.();
    await screen.findByTestId("select-option-1");
  });

  it("preserves every selected user across disjoint searches", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const selectionChanges: number[][] = [];
    const apiCall = mock((_method: string, params: Record<string, unknown>) => {
      requests.push(params);
      const results = params.search === "matt" ? [users.mattOne, users.mattTwo] : [users.other];
      return Promise.resolve({ results, count: results.length });
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });

    const ControlledUserSelect = () => {
      const [value, setValue] = useState<number[]>([]);
      return (
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={value}
          onChange={(nextValue: number[]) => {
            selectionChanges.push(nextValue);
            setValue(nextValue);
          }}
          placeholder="Select annotators"
        />
      );
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ControlledUserSelect />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select annotators" }));
    const searchField = await screen.findByTestId("select-search-field");
    fireEvent.change(searchField, { target: { value: "matt" } });
    await waitFor(() => expect(requests.some((request) => request.search === "matt")).toBe(true));

    fireEvent.click(await screen.findByTestId("select-option-1"));
    await waitFor(() => expect(selectionChanges.at(-1)).toEqual([1]));
    fireEvent.click(await screen.findByTestId("select-option-2"));
    await waitFor(() => expect(selectionChanges.at(-1)).toEqual([1, 2]));

    fireEvent.change(searchField, { target: { value: "other" } });
    await waitFor(() =>
      expect(
        requests.some(
          (request) => request.search === "other" && JSON.stringify(request.selected_value) === JSON.stringify([1, 2]),
        ),
      ).toBe(true),
    );
    fireEvent.click(await screen.findByTestId("select-option-3"));
    await waitFor(() => expect(selectionChanges.at(-1)).toEqual([1, 2, 3]));

    const selectedItemsGroup = await screen.findByRole("button", { name: /Selected items group/ });
    expect(selectedItemsGroup).toHaveAttribute("aria-label", "Selected items group, 3 items selected");
  });

  it("FIT-2394: truncates the closed trigger for many selected users", async () => {
    const allUsers = [users.mattOne, users.mattTwo, users.other, users.reviewer];
    const selectedIds = allUsers.map(({ id }) => id);
    const apiCall = mock((_method: string, _params: Record<string, unknown>) => {
      return Promise.resolve({ results: allUsers, count: allUsers.length });
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });
    queryClient.setQueryData(["projectUsers", 42, undefined, 10, null, selectedIds], {
      pages: [{ results: allUsers, count: allUsers.length }],
      pageParams: [undefined],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserSelect
          filter={{ view: { project: { id: 42 } } }}
          multiple={true}
          value={selectedIds}
          onChange={() => {}}
          placeholder="Select annotators"
        />
      </QueryClientProvider>,
    );

    const summary = await screen.findByTestId("user-select-trigger-summary");
    expect(summary).toHaveTextContent("Matt One");
    expect(summary).toHaveTextContent("+3");
    expect(screen.getByLabelText("3 more selected")).toBeInTheDocument();

    // Closed trigger must not dump every selected name/email (overflow / page-edge break).
    expect(summary).not.toHaveTextContent("Matt Two");
    expect(summary).not.toHaveTextContent("Other User");
    expect(summary).not.toHaveTextContent("Review User");
    expect(summary).not.toHaveTextContent("matt.two@example.test");
    expect(summary).not.toHaveTextContent("other@example.test");
    expect(summary).not.toHaveTextContent("reviewer@example.test");

    // Wired into Select's closed-trigger slot (not a detached node).
    expect(screen.getByTestId("select-display-value")).toContainElement(summary);
    expect(screen.getByRole("button", { name: /Matt One/ })).toContainElement(summary);
  });

  it("uses projectUsers and loads the next page", async () => {
    const requests: Array<{ method: string; params: Record<string, unknown> }> = [];
    const apiCall = mock((method: string, params: Record<string, unknown>) => {
      requests.push({ method, params });
      const page = Number(params.page);
      return Promise.resolve({
        results: [page === 1 ? users.mattOne : users.mattTwo],
        count: 2,
      });
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDataManagerUsers(42, 1), { wrapper });
    await waitFor(() => expect(result.current.users.map(({ id }) => id)).toEqual([users.mattOne.id]));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.users.map(({ id }) => id)).toEqual([users.mattOne.id, users.mattTwo.id]));
    expect(requests.map(({ method }) => method).every((method) => method === "projectUsers")).toBe(true);
    expect(requests.some(({ params }) => params.page === 2)).toBe(true);
  });

  it("rehydrates more than 100 selected users with bounded requests", async () => {
    const selectedIds = Array.from({ length: 120 }, (_, index) => index + 1);
    const requests: Array<Record<string, unknown>> = [];
    const apiCall = mock((_method: string, params: Record<string, unknown>) => {
      requests.push(params);
      const requestedIds = Array.isArray(params.selected_value) ? (params.selected_value as number[]) : [];
      return Promise.resolve({
        results: requestedIds.map((id) => ({
          id,
          username: `user-${id}`,
          first_name: `User ${id}`,
          last_name: "",
          email: `user-${id}@example.test`,
        })),
        count: selectedIds.length,
      });
    });
    window.DM = { store: { apiCall } };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDataManagerUsers(42, 10, null, selectedIds), { wrapper });

    await waitFor(() => expect(result.current.users).toHaveLength(120));
    const selectedRequests = requests.filter(({ selected_value }) => Array.isArray(selected_value));
    expect(selectedRequests.length).toBeGreaterThan(1);
    expect(selectedRequests.every(({ selected_value }) => (selected_value as number[]).length <= 100)).toBe(true);
  });
});
