import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { AutoAcceptToggle } from "../AutoAcceptToggle";

function createStore(overrides = {}) {
  const annotation = overrides.annotation ?? {
    hasSuggestionsSupport: true,
    suggestions: { size: 0 },
    rejectAllSuggestions: jest.fn(),
    acceptAllSuggestions: jest.fn(),
  };
  return {
    autoAnnotation: true,
    forceAutoAcceptSuggestions: false,
    awaitingSuggestions: false,
    autoAcceptSuggestions: false,
    setAutoAcceptSuggestions: jest.fn(),
    annotationStore: { selected: annotation },
    ...overrides,
  };
}

describe("AutoAcceptToggle", () => {
  it("returns null when store.autoAnnotation is false", () => {
    const store = createStore({ autoAnnotation: false });
    store.annotationStore = undefined;
    const { container } = render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders wrapper with Toggle when autoAnnotation true and no suggestions", async () => {
    const user = userEvent.setup();
    const setAutoAcceptSuggestions = jest.fn();
    const store = createStore({
      setAutoAcceptSuggestions,
      annotation: {
        hasSuggestionsSupport: true,
        suggestions: { size: 0 },
      },
    });
    render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    const toggle = screen.getByTestId("bottombar-auto-accept-toggle");
    expect(toggle).toBeInTheDocument();
    await user.click(toggle);
    expect(setAutoAcceptSuggestions).toHaveBeenCalled();
  });

  it("renders accept/reject buttons when suggestions.size > 0", () => {
    const rejectAllSuggestions = jest.fn();
    const acceptAllSuggestions = jest.fn();
    const store = createStore({
      annotation: {
        hasSuggestionsSupport: true,
        suggestions: { size: 2 },
        rejectAllSuggestions,
        acceptAllSuggestions,
      },
    });
    render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    expect(screen.getByText("2 suggestions")).toBeInTheDocument();
    const rejectBtn = screen.getByTestId("bottombar-reject-suggestions-button");
    const acceptBtn = screen.getByTestId("bottombar-accept-suggestions-button");
    rejectBtn.click();
    expect(rejectAllSuggestions).toHaveBeenCalled();
    acceptBtn.click();
    expect(acceptAllSuggestions).toHaveBeenCalled();
  });

  it("renders 1 suggestion singular text", () => {
    const store = createStore({
      annotation: {
        hasSuggestionsSupport: true,
        suggestions: { size: 1 },
      },
    });
    render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    expect(screen.getByText("1 suggestions")).toBeInTheDocument();
  });

  it("shows spinner when loading", () => {
    const store = createStore({ awaitingSuggestions: true });
    const { container } = render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    const spinner = container.querySelector("[class*='spinner']");
    expect(spinner).toBeInTheDocument();
  });

  it("does not render wrapper when forceAutoAcceptSuggestions is true", () => {
    const store = createStore({ forceAutoAcceptSuggestions: true });
    render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    expect(screen.queryByTestId("bottombar-auto-accept-toggle")).not.toBeInTheDocument();
  });
});
