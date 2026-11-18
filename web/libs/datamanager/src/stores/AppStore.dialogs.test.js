import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Modal } from "../components/Common/Modal/Modal";
import { AppStore } from "./AppStore";

describe("AppStore dialogs", () => {
  let store;
  let configured;
  let unsavedComments;
  let setTaskCalls;
  let imperativeConfirm;

  const TestAppStore = AppStore.views(() => ({
    get labelingIsConfigured() {
      return configured;
    },
    get currentView() {
      return null;
    },
    get dataStore() {
      return { loadingItem: false };
    },
  })).actions(() => ({
    setTask(params) {
      setTaskCalls.push(params);
    },
  }));

  beforeEach(() => {
    configured = true;
    unsavedComments = false;
    setTaskCalls = [];
    imperativeConfirm = spyOn(Modal, "confirm");
    store = TestAppStore.create({ toolbar: "" });
    store._sdk = {
      setMode: mock(() => {}),
      invoke: mock(() => {}),
      lsf: {
        lsf: {
          annotationStore: {
            selected: {
              commentStore: {
                get hasUnsaved() {
                  return unsavedComments;
                },
              },
            },
          },
        },
      },
    };
  });

  afterEach(() => {
    // Nothing here may open a dialog in a React root of its own.
    const calls = imperativeConfirm.mock.calls.length;
    imperativeConfirm.mockRestore();
    expect(calls).toBe(0);
  });

  it("has no dialog to begin with", () => {
    expect(store.pendingDialog).toBeNull();
  });

  describe("labeling is not configured", () => {
    beforeEach(() => {
      configured = false;
    });

    for (const [name, start] of [
      ["startLabelStream", (s) => s.startLabelStream({ pushState: false })],
      ["startLabeling", (s) => s.startLabeling({ id: 5, isSelected: false })],
    ]) {
      it(`${name} asks to set labeling up instead of starting`, () => {
        start(store);

        expect(store.pendingDialog.kind).toBe("confirm");
        expect(store.pendingDialog.content.title).toBe("You're almost there!");
        expect(store.pendingDialog.content.children).toBe(
          "Before you can annotate the data, set up labeling configuration",
        );
        expect(store.pendingDialog.content.okText).toBe("Go to setup");
        expect(store._sdk.setMode).not.toHaveBeenCalled();
        expect(setTaskCalls).toEqual([]);
      });
    }

    it("goes to the settings when the dialog is confirmed", () => {
      store.startLabelStream({ pushState: false });

      store.pendingDialog.content.onOk();

      expect(store._sdk.invoke).toHaveBeenCalledWith("settingsClicked");
      expect(store._sdk.setMode).not.toHaveBeenCalled();
    });

    it("does nothing when the dialog is dismissed", () => {
      store.startLabelStream({ pushState: false });

      store.dismissDialog(store.pendingDialog);

      expect(store.pendingDialog).toBeNull();
      expect(store._sdk.invoke).not.toHaveBeenCalled();
      expect(store._sdk.setMode).not.toHaveBeenCalled();
    });

    it("asks before the unsaved-comments check, so only one dialog is queued", () => {
      unsavedComments = true;

      store.startLabelStream({ pushState: false });

      expect(store.pendingDialog.content.title).toBe("You're almost there!");
    });
  });

  describe("comments are not saved", () => {
    beforeEach(() => {
      unsavedComments = true;
    });

    it("startLabelStream waits for the confirmation, then starts the stream", () => {
      store.startLabelStream({ pushState: false });

      expect(store.pendingDialog.kind).toBe("confirm");
      expect(store.pendingDialog.content.title).toBe("You have unsaved changes");
      expect(store.pendingDialog.content.children).toContain("Continuing will discard these comments.");
      expect(store.pendingDialog.content.okText).toBe("Discard and continue");
      expect(store._sdk.setMode).not.toHaveBeenCalled();

      store.pendingDialog.content.onOk();

      expect(store._sdk.setMode).toHaveBeenCalledTimes(1);
      expect(store._sdk.setMode).toHaveBeenCalledWith("labelstream");
    });

    it("startLabelStream starts nothing when the confirmation is dismissed", () => {
      store.startLabelStream({ pushState: false });

      store.dismissDialog(store.pendingDialog);

      expect(store.pendingDialog).toBeNull();
      expect(store._sdk.setMode).not.toHaveBeenCalled();
    });

    it("startLabeling waits for the confirmation, then opens the task", () => {
      store.startLabeling({ id: 5, isSelected: false });

      expect(store.pendingDialog.content.title).toBe("You have unsaved changes");
      expect(store._sdk.setMode).not.toHaveBeenCalled();
      expect(setTaskCalls).toEqual([]);

      store.pendingDialog.content.onOk();

      expect(store._sdk.setMode).toHaveBeenCalledWith("labeling");
      expect(setTaskCalls).toHaveLength(1);
      expect(setTaskCalls[0].taskID).toBe(5);
    });

    it("startLabeling opens an annotation's task with the annotation selected", () => {
      store.startLabeling({ id: 9, task_id: 5, isSelected: false });
      store.pendingDialog.content.onOk();

      expect(setTaskCalls[0].taskID).toBe(5);
      expect(setTaskCalls[0].annotationID).toBe(9);
    });

    it("startLabeling opens nothing when the confirmation is dismissed", () => {
      store.startLabeling({ id: 5, isSelected: false });

      store.dismissDialog(store.pendingDialog);

      expect(store._sdk.setMode).not.toHaveBeenCalled();
      expect(setTaskCalls).toEqual([]);
    });
  });

  describe("nothing to confirm", () => {
    it("startLabelStream starts right away", () => {
      store.startLabelStream({ pushState: false });

      expect(store.pendingDialog).toBeNull();
      expect(store._sdk.setMode).toHaveBeenCalledWith("labelstream");
    });

    it("startLabeling opens the task right away", () => {
      store.startLabeling({ id: 5, isSelected: false });

      expect(store.pendingDialog).toBeNull();
      expect(store._sdk.setMode).toHaveBeenCalledWith("labeling");
      expect(setTaskCalls[0].taskID).toBe(5);
    });
  });

  describe("showConfirm, showNotice and dismissDialog", () => {
    it("holds a confirmation and a notice as different kinds", () => {
      store.showConfirm({ title: "Sure?" });
      expect(store.pendingDialog).toEqual({ kind: "confirm", content: { title: "Sure?" } });

      store.showNotice({ title: "FYI" });
      expect(store.pendingDialog).toEqual({ kind: "notice", content: { title: "FYI" } });
    });

    it("only clears the dialog it is given, so a dialog queued by a confirm button survives", () => {
      store.showConfirm({ title: "First" });
      const first = store.pendingDialog;
      store.showConfirm({ title: "Second" });

      store.dismissDialog(first);

      expect(store.pendingDialog.content.title).toBe("Second");
      store.dismissDialog(store.pendingDialog);
      expect(store.pendingDialog).toBeNull();
    });
  });
});
