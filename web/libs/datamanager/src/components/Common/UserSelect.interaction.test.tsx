import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
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
  it("keeps the remaining matching user visible after selecting one", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const apiCall = mock((_method: string, params: Record<string, unknown>) => {
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
    queryClient.setQueryData(["users", 42, 10, false, null, null, selectedIds], {
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
        (request) => !request.search && JSON.stringify(request.selected_value) === JSON.stringify(selectedIds),
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
});
