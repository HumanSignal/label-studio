import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Modal } from "../../components/Common/Modal/Modal";
import { LSFWrapper } from "../lsf-sdk";

describe("LSFWrapper dialogs", () => {
  let wrapper;
  let store;
  let unsavedComments;
  let imperativeConfirm;
  let imperativeModal;

  beforeEach(() => {
    unsavedComments = false;
    imperativeConfirm = spyOn(Modal, "confirm");
    imperativeModal = spyOn(Modal, "modal");
    store = {
      showConfirm: mock(() => {}),
      showNotice: mock(() => {}),
      taskStore: {
        loadTask: mock((id) => Promise.resolve({ id })),
        loadNextTask: mock(() => Promise.resolve({ id: 77 })),
      },
    };
    wrapper = Object.create(LSFWrapper.prototype);
    wrapper.datamanager = { store, api: { call: mock(() => Promise.resolve(null)) } };
    wrapper.lsf = {
      setFlags: mock(() => {}),
      commentStore: {
        get hasUnsaved() {
          return unsavedComments;
        },
      },
    };
    wrapper.withinLoadingState = mock((callback) => callback());
    wrapper.selectTask = mock(() => Promise.resolve());
  });

  afterEach(() => {
    // Nothing here may open a dialog in a React root of its own.
    const calls = imperativeConfirm.mock.calls.length + imperativeModal.mock.calls.length;
    imperativeConfirm.mockRestore();
    imperativeModal.mockRestore();
    expect(calls).toBe(0);
  });

  describe("loadTask", () => {
    it("loads the task right away when no comment is unsaved", async () => {
      await wrapper.loadTask(5, 9, true);

      expect(store.showConfirm).not.toHaveBeenCalled();
      expect(store.taskStore.loadTask).toHaveBeenCalledWith(5);
      expect(wrapper.selectTask).toHaveBeenCalledWith({ id: 5 }, 9, true);
    });

    it("loads the next task when no task is named", async () => {
      await wrapper.loadTask();

      expect(store.taskStore.loadNextTask).toHaveBeenCalledTimes(1);
      expect(wrapper.selectTask).toHaveBeenCalledWith({ id: 77 }, undefined, false);
    });

    it("asks first when comments are unsaved, and loads nothing until confirmed", async () => {
      unsavedComments = true;

      await wrapper.loadTask(5, 9);

      expect(store.showConfirm).toHaveBeenCalledTimes(1);
      const content = store.showConfirm.mock.calls[0][0];
      expect(content.title).toBe("You have unsaved changes");
      expect(content.children).toContain("Continuing will discard these comments.");
      expect(content.okText).toBe("Discard and continue");
      expect(store.taskStore.loadTask).not.toHaveBeenCalled();
      expect(wrapper.selectTask).not.toHaveBeenCalled();
    });

    it("loads the task once the confirmation is accepted", async () => {
      unsavedComments = true;
      await wrapper.loadTask(5, 9);

      store.showConfirm.mock.calls[0][0].onOk();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.taskStore.loadTask).toHaveBeenCalledWith(5);
      expect(wrapper.selectTask).toHaveBeenCalledWith({ id: 5 }, 9, false);
    });

    it("does not hold the confirmation open while the task loads", async () => {
      unsavedComments = true;
      store.taskStore.loadTask = mock(() => new Promise(() => {}));
      await wrapper.loadTask(5);

      // A promise here would keep the dialog up, over the Data Manager's own loading state.
      expect(store.showConfirm.mock.calls[0][0].onOk()).toBeUndefined();
      expect(store.taskStore.loadTask).toHaveBeenCalledWith(5);
    });

    it("does nothing without an editor", async () => {
      const error = spyOn(console, "error").mockImplementation(() => {});
      wrapper.lsf = undefined;

      await wrapper.loadTask(5);

      expect(store.showConfirm).not.toHaveBeenCalled();
      expect(store.taskStore.loadTask).not.toHaveBeenCalled();
      error.mockRestore();
    });
  });

  describe("preloadTask", () => {
    it("says the task was not found, and selects nothing", async () => {
      wrapper.preload = { task: 5 };

      expect(await wrapper.preloadTask()).toBe(false);

      expect(store.showNotice).toHaveBeenCalledTimes(1);
      expect(store.showNotice.mock.calls[0][0]).toEqual({
        title: "Can't find task",
        children: "Task #5 was not found!",
      });
      expect(wrapper.selectTask).not.toHaveBeenCalled();
    });

    it("names the comment when the link pointed at one", async () => {
      wrapper.preload = { task: 5, comment: 9 };

      await wrapper.preloadTask();

      expect(wrapper.datamanager.api.call).toHaveBeenCalledWith("task", { params: { taskID: 5, with_comment: 9 } });
      expect(store.showNotice.mock.calls[0][0].children).toBe("Task #5 with comment #9 was not found!");
    });

    it("treats a task with no annotations and no drafts as not found", async () => {
      wrapper.preload = { task: 5 };
      wrapper.datamanager.api.call = mock(() => Promise.resolve({ id: 5, annotations: [], drafts: [] }));

      await wrapper.preloadTask();

      expect(store.showNotice).toHaveBeenCalledTimes(1);
      expect(wrapper.selectTask).not.toHaveBeenCalled();
    });

    it("selects the first annotation of a task that exists, with no notice", async () => {
      wrapper.preload = { task: 5 };
      const task = { id: 5, annotations: [{ id: 31 }, { id: 32 }], drafts: [] };
      wrapper.datamanager.api.call = mock(() => Promise.resolve(task));

      await wrapper.preloadTask();

      expect(store.showNotice).not.toHaveBeenCalled();
      expect(wrapper.selectTask).toHaveBeenCalledWith(task, 31, true);
    });
  });
});
