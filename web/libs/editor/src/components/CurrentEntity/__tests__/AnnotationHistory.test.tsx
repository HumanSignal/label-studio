import { render } from "@testing-library/react";
import { Provider } from "mobx-react";
import { AnnotationHistory } from "../AnnotationHistory";

// BROS-1302: indicator must use the `history-item` BEM block the CSS styles.

type MockAnnotationOptions = {
  isDraftSaving?: boolean;
  hasChanges?: boolean;
  hasDraft?: boolean;
};

function createMockStore({ isDraftSaving = false, hasChanges = true, hasDraft = true }: MockAnnotationOptions) {
  const list = {
    store: { hasInterface: () => false },
    selectHistory: () => {},
  };
  const annotation = {
    history: { hasChanges, history: [{}] },
    versions: { draft: hasDraft ? { result: [] } : undefined },
    isDraftSaving,
    draftSaved: "2026-01-01T00:00:00.000Z",
    draftSelected: false,
    user: { email: "me@example.com" },
    createdBy: "me@example.com",
    list,
    toggleDraft: () => {},
  };
  return {
    annotationStore: {
      selected: annotation,
      history: [],
      selectedHistory: null,
      store: { hasInterface: () => false },
    },
  };
}

function renderHistory(options: MockAnnotationOptions) {
  const store = createMockStore(options);
  return render(
    <Provider store={store}>
      <AnnotationHistory />
    </Provider>,
  );
}

describe("AnnotationHistory draft indicator (BROS-1302)", () => {
  it("renders the saving spinner under the history-item block", () => {
    const { container } = renderHistory({ isDraftSaving: true });

    expect(container.querySelector(".ls-history-item__spin")).not.toBeNull();
  });
});
