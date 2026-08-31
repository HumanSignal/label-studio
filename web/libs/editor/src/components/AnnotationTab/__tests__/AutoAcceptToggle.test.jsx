import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "mobx-react";
import { AutoAcceptToggle } from "../AutoAcceptToggle";

function createStore(overrides = {}) {
  const annotation = overrides.annotation ?? {
    hasSuggestionsSupport: true,
    suggestions: { size: 0 },
    rejectAllSuggestions: mock(),
    acceptAllSuggestions: mock(),
  };
  return {
    autoAnnotation: true,
    forceAutoAcceptSuggestions: false,
    awaitingSuggestions: false,
    autoAcceptSuggestions: false,
    setAutoAcceptSuggestions: mock(),
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
    const setAutoAcceptSuggestions = mock();
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
    const rejectAllSuggestions = mock();
    const acceptAllSuggestions = mock();
    const store = createStore({
      annotation: {
        hasSuggestionsSupport: true,
        suggestions: { size: 2 },
        rejectAllSuggestions,
        acceptAllSuggestions,
      },
    });
    const { container } = render(
      <Provider store={store}>
        <AutoAcceptToggle />
      </Provider>,
    );
    expect(screen.getByText("2 suggestions")).toBeInTheDocument();
    const rejectBtn = container.querySelector(".ls-auto-accept__action_type_reject");
    const acceptBtn = container.querySelector(".ls-auto-accept__action_type_accept");
    expect(rejectBtn).toBeInTheDocument();
    expect(acceptBtn).toBeInTheDocument();
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
