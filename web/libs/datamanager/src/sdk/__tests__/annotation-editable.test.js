import { annotationEditable, LSFWrapper, shouldHoldProjectAccessDenied } from "../lsf-sdk";

// Keep the SDK constructor and permission setup real; replace only editor mounting.
class UnmountedWrapper extends LSFWrapper {
  initLabelStudio(options) {
    this.editorOptions = options;
  }
}

function createWrapper(canManage = false, isLabelStream = false) {
  const task = { id: 10, annotations: [], drafts: [], deleteAnnotation: mock(), deleteDraft: mock() };
  const wrapper = new UnmountedWrapper(
    {
      store: { project: { access: { can_manage: canManage } }, users: [] },
      hasInterface: () => false,
      apiCall: mock(async () => ({ $meta: { status: 204 } })),
      invoke: mock(),
    },
    null,
    { task, user: { id: 1 }, isLabelStream },
  );
  wrapper.lsf = { user: { id: 1 }, annotationStore: { annotations: [], selected: null, viewingAll: false } };
  wrapper.loadTask = mock(async () => {});
  wrapper.withinLoadingState = (callback) => callback();
  return wrapper;
}

test("members retain annotation deletion with an owner-only interface", () => {
  const wrapper = createWrapper();

  expect(wrapper.editorOptions.interfaces).toContain("annotations:delete");
  expect(wrapper.editorOptions.interfaces).toContain("annotations:delete-own");
  expect(wrapper.editorOptions.interfaces).not.toContain("predictions:delete");
});

test("member label stream keeps owner-only model permissions even without delete controls", () => {
  const previousLocation = globalThis.location;
  globalThis.location = window.location;
  try {
    const wrapper = createWrapper(false, true);

    expect(wrapper.editorOptions.interfaces).toContain("annotations:delete-own");
    expect(wrapper.editorOptions.interfaces).not.toContain("annotations:delete");
  } finally {
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
  }
});

test.each([
  [false, { pk: "41", user: { id: 1 } }, "deleteAnnotation"],
  [false, { pk: "41", user: { id: 2 } }, null],
  [false, { pk: "41", user: null }, null],
  [true, { pk: "41", user: { id: 2 } }, "deleteAnnotation"],
  [true, { pk: "41", user: null }, "deleteAnnotation"],
  [false, { pk: null, user: { id: 1 }, userGenerate: true, sentUserGenerate: false, draftId: 12 }, "deleteDraft"],
  [false, { pk: null, user: { id: 2 }, userGenerate: true, sentUserGenerate: false, draftId: 12 }, null],
  [true, { pk: null, user: { id: 2 }, userGenerate: true, sentUserGenerate: false, draftId: 12 }, null],
])("SDK delete checks ownership (manager=%j, annotation=%j)", async (canManage, data, endpoint) => {
  const wrapper = createWrapper(canManage);
  const annotation = { id: "editor-id", type: "annotation", editable: true, ...data };

  await wrapper.onDeleteAnnotation(wrapper.lsf, annotation);

  if (endpoint) {
    expect(wrapper.datamanager.apiCall).toHaveBeenCalledWith(
      endpoint,
      endpoint === "deleteDraft" ? { draftID: 12 } : { taskID: 10, annotationID: "41" },
    );
  } else {
    expect(wrapper.datamanager.apiCall).not.toHaveBeenCalled();
    expect(wrapper.task.deleteAnnotation).not.toHaveBeenCalled();
  }
});

test("another annotator's result is read only for a member", () => {
  expect(annotationEditable({ completed_by: 2 }, 1, false)).toBe(false);
  expect(annotationEditable({ completed_by: 1 }, 1, false)).toBe(true);
  expect(annotationEditable({ completed_by: 2 }, 1, true)).toBe(true);
});

test("SDK preserves saved identity when a member opens an annotation whose author was deleted", () => {
  const annotation = {
    id: "editor-id",
    pk: "41",
    type: "annotation",
    user: null,
    editable: true,
    setEditable(value) {
      this.editable = value;
    },
  };
  const wrapper = {
    project: { access: { can_manage: false } },
    lsf: { user: { id: 1 }, annotationStore: { annotations: [annotation] } },
  };

  LSFWrapper.prototype.applyAnnotationEditability.call(wrapper);

  expect(annotation.editable).toBe(false);
});

test("a manager annotation stays read-only in view all", () => {
  const calls = [];
  const annotation = {
    type: "annotation",
    completed_by: 2,
    editable: false,
    setEditable(value) {
      calls.push(value);
      this.editable = value;
    },
  };
  const wrapper = {
    project: { access: { can_manage: true } },
    lsf: { user: { id: 1 }, annotationStore: { annotations: [annotation] } },
  };

  LSFWrapper.prototype.applyAnnotationEditability.call(wrapper);

  expect(calls).toEqual([]);
  expect(annotation.editable).toBe(false);
});

test("project denial stays on the page", () => {
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 403)).toBe(true);
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 404)).toBe(true);
  expect(shouldHoldProjectAccessDenied("/organization", 404)).toBe(false);
  expect(shouldHoldProjectAccessDenied("/projects/5/data", 401)).toBe(false);
});
