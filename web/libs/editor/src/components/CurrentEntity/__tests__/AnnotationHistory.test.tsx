import { act, render } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { Provider } from "mobx-react";
import { AnnotationHistory } from "../AnnotationHistory";

// BROS-1302: indicator must use the `history-item` BEM block the CSS styles.

type MockAnnotationOptions = {
  isDraftSaving?: boolean;
  hasChanges?: boolean;
  hasDraft?: boolean;
  needsDraftSave?: boolean;
};

function createMockStore({
  isDraftSaving = false,
  hasChanges = true,
  hasDraft = true,
  needsDraftSave = false,
}: MockAnnotationOptions) {
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
    needsDraftSave: () => needsDraftSave,
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

/**
 * BROS-1477: Selecting an Annotation History item (or an image resize / zoom) can rebuild
 * the undo stack via `reinitHistory`, changing `history.history.length` without any real
 * edit. The old indicator turned the "unsaved" dot on for *any* length change and only
 * turned it off when a new draft finished saving — so a non-edit length change left the
 * dot (i.e. the draft-saving indicator) stuck on forever. The indicator must instead be
 * driven by whether a draft actually needs saving.
 *
 * These tests use a real mobx-observable annotation so the `observer`-wrapped indicator
 * actually re-renders on the store change, reproducing the stuck-indicator regression.
 */
describe("AnnotationHistory draft indicator (BROS-1477)", () => {
  function createObservableStore({
    lastEditMs,
    draftSavedMs,
    historyLength,
  }: {
    lastEditMs: number;
    draftSavedMs: number;
    historyLength: number;
  }) {
    const history = observable(
      {
        history: Array.from({ length: historyLength }, () => ({})),
        lastAdditionTime: lastEditMs,
        get hasChanges() {
          return this.history.length > 1;
        },
      },
      { history: observable.shallow },
    );

    const annotation = observable(
      {
        history,
        versions: { draft: { result: [] } },
        isDraftSaving: false,
        draftSaved: new Date(draftSavedMs).toISOString(),
        draftSelected: false,
        user: { email: "me@example.com" },
        createdBy: "me@example.com",
        list: { store: { hasInterface: () => false }, selectHistory: () => {} },
        toggleDraft: () => {},
        // Mirrors the store's real rule: a draft only needs saving when the latest edit
        // is newer than the last successful draft save.
        needsDraftSave() {
          if (!this.history.hasChanges) return false;
          if (!this.draftSaved) return true;
          if (!this.history.lastAdditionTime) return true;
          return new Date(this.history.lastAdditionTime) > new Date(this.draftSaved);
        },
      },
      {
        versions: observable.ref,
        user: observable.ref,
        list: observable.ref,
      },
    );

    const store = {
      annotationStore: {
        selected: annotation,
        history: [],
        selectedHistory: null,
        store: { hasInterface: () => false },
      },
    };

    return { store, annotation };
  }

  it("does not leave the draft indicator stuck when the undo stack is rebuilt without an edit", () => {
    // Draft already saved after the last edit (draftSaved is newer than the last edit).
    const { store, annotation } = createObservableStore({
      lastEditMs: 1000,
      draftSavedMs: 2000,
      historyLength: 2,
    });

    const { container } = render(
      <Provider store={store}>
        <AnnotationHistory />
      </Provider>,
    );

    // Baseline: nothing to save, so no unsaved dot.
    expect(container.querySelector(".ls-history-item__dot")).toBeNull();

    // Simulate `reinitHistory` collapsing the undo stack (no real edit, draftSaved untouched).
    act(() => {
      runInAction(() => {
        annotation.history.history.replace([{}]);
      });
    });

    // Regression: the dot must not appear/stick, because nothing needs saving.
    expect(container.querySelector(".ls-history-item__dot")).toBeNull();
  });

  it("shows the unsaved dot when there are genuine unsaved edits", () => {
    // Last edit is newer than the last draft save → there is something to persist.
    const { container } = render(
      <Provider store={createObservableStore({ lastEditMs: 3000, draftSavedMs: 2000, historyLength: 2 }).store}>
        <AnnotationHistory />
      </Provider>,
    );

    expect(container.querySelector(".ls-history-item__dot")).not.toBeNull();
  });
});
