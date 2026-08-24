import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { LSFWrapper } from "../lsf-sdk";

describe("LSFWrapper setAnnotation ID matching (FIT-1949)", () => {
  let wrapper;
  let mockLsf;

  beforeEach(() => {
    wrapper = Object.create(LSFWrapper.prototype);
    mockLsf = {
      annotationStore: {
        annotations: [],
        predictions: [],
        selectAnnotation: mock(() => {}),
        selectPrediction: mock(() => {}),
      },
    };
    wrapper.lsf = mockLsf;
    wrapper.datamanager = {
      invoke: mock(() => {}),
      store: {
        project: {
          show_collab_predictions: false,
        },
      },
    };
  });

  it("matches annotation with numeric pk when search ID is a string", async () => {
    const targetAnnotation = { pk: 97375393, id: "1", type: "annotation" };
    mockLsf.annotationStore.annotations = [targetAnnotation];
    wrapper.task = { drafts: [] };

    // Pass annotationID as number (which setAnnotation converts to string internally)
    await wrapper.setAnnotation(97375393, false, false);

    expect(mockLsf.annotationStore.selectAnnotation).toHaveBeenCalledWith("1");
  });

  it("matches annotation with string id when search ID is a string", async () => {
    const targetAnnotation = { pk: null, id: "alphanumeric-abc", type: "annotation" };
    mockLsf.annotationStore.annotations = [targetAnnotation];
    wrapper.task = { drafts: [] };

    await wrapper.setAnnotation("alphanumeric-abc", false, false);

    expect(mockLsf.annotationStore.selectAnnotation).toHaveBeenCalledWith("alphanumeric-abc");
  });
});

describe("LSFWrapper setAnnotation orphan-draft restoration", () => {
  let wrapper;
  let mockLsf;
  let added;

  const orphanDraft = (overrides = {}) => ({
    id: 48490,
    annotation: null,
    result: [],
    created_by: { id: 7 },
    created_at: "2026-07-01T00:00:00Z",
    ...overrides,
  });

  const restoredAnnotationStub = () => ({
    id: "restored-1",
    history: { freeze: mock(), safeUnfreeze: mock() },
    deserializeResults: mock(),
    setDraftId: mock(),
    setDraftSaved: mock(),
    reinitHistory: mock(),
  });

  afterEach(() => {
    window.APP_SETTINGS = undefined;
  });

  beforeEach(() => {
    window.APP_SETTINGS = { user: { id: 7, role: "AN" } };
    added = [];
    wrapper = Object.create(LSFWrapper.prototype);
    mockLsf = {
      user: { id: 7 },
      annotationStore: {
        annotations: [],
        predictions: [],
        addAnnotation: mock((payload) => {
          added.push(payload);
          const stub = restoredAnnotationStub();
          mockLsf.annotationStore.annotations.push(stub);
          return stub;
        }),
        createAnnotation: mock(() => {
          const blank = { id: "blank-1", pk: null };
          mockLsf.annotationStore.annotations.push(blank);
          return blank;
        }),
        selectAnnotation: mock(() => {}),
        selectPrediction: mock(() => {}),
      },
    };
    wrapper.lsf = mockLsf;
    wrapper.labelStream = false;
    wrapper.datamanager = {
      invoke: mock(() => {}),
      store: { project: { show_collab_predictions: false } },
    };
  });

  it("does not resurrect an orphan draft as a new annotation when the owner already has a submitted annotation", async () => {
    const existing = { id: "10", pk: 555, type: "annotation", user: { id: 7 }, skipped: false, ground_truth: false };
    mockLsf.annotationStore.annotations = [existing];
    wrapper.task = { drafts: [orphanDraft()] };

    await wrapper.setAnnotation(null, false, false);

    expect(added).toHaveLength(0);
    expect(mockLsf.annotationStore.selectAnnotation).toHaveBeenCalledWith("10");
  });

  it("still restores the orphan draft when the owner has no submitted annotation", async () => {
    wrapper.task = { drafts: [orphanDraft()] };

    await wrapper.setAnnotation(null, false, false);

    expect(added).toHaveLength(1);
  });

  it("still restores when the existing annotation belongs to another user", async () => {
    const someoneElses = {
      id: "11",
      pk: 556,
      type: "annotation",
      user: { id: 99 },
      skipped: false,
      ground_truth: false,
    };
    mockLsf.annotationStore.annotations = [someoneElses];
    wrapper.task = { drafts: [orphanDraft()] };

    await wrapper.setAnnotation(null, false, false);

    expect(added).toHaveLength(1);
  });

  it("still restores when the owner's only annotation is a skip or ground truth", async () => {
    mockLsf.annotationStore.annotations = [
      { id: "12", pk: 557, type: "annotation", user: { id: 7 }, skipped: true, ground_truth: false },
      { id: "13", pk: 558, type: "annotation", user: { id: 7 }, skipped: false, ground_truth: true },
    ];
    wrapper.task = { drafts: [orphanDraft()] };

    await wrapper.setAnnotation(null, false, false);

    expect(added).toHaveLength(1);
  });

  it("label stream revisit without annotationID selects the user's own annotation, not a blank create", async () => {
    wrapper.labelStream = true;
    const existing = { id: "20", pk: 600, type: "annotation", user: { id: 7 }, skipped: false, ground_truth: false };
    mockLsf.annotationStore.annotations = [existing];
    wrapper.task = { drafts: [] };

    await wrapper.setAnnotation(undefined, false, false);

    expect(mockLsf.annotationStore.createAnnotation).not.toHaveBeenCalled();
    expect(mockLsf.annotationStore.selectAnnotation).toHaveBeenCalledWith("20");
  });

  it("guard is inert when the current user id cannot be resolved (no spurious userless match)", async () => {
    wrapper.labelStream = true;
    mockLsf.user = undefined;
    window.APP_SETTINGS = { user: { role: "AN" } }; // annotator, but no resolvable id
    const userless = { id: "30", pk: 700, type: "annotation", user: null, skipped: false, ground_truth: false };
    mockLsf.annotationStore.annotations = [userless];
    wrapper.task = { drafts: [orphanDraft()] };

    await wrapper.setAnnotation(undefined, false, false);

    // orphan still restored (skip disabled) and no own-annotation preference applied
    expect(added).toHaveLength(1);
    expect(mockLsf.annotationStore.selectAnnotation).not.toHaveBeenCalledWith("30");
  });

  it("elevated roles keep the old behavior: draft restored alongside their submitted annotation", async () => {
    window.APP_SETTINGS = { user: { id: 7, role: "AD" } };
    const existing = { id: "40", pk: 800, type: "annotation", user: { id: 7 }, skipped: false, ground_truth: false };
    mockLsf.annotationStore.annotations = [existing];
    wrapper.task = { drafts: [orphanDraft()] };

    await wrapper.setAnnotation(null, false, false);

    expect(added).toHaveLength(1);
  });

  it("label stream with no own annotation still creates a fresh one", async () => {
    wrapper.labelStream = true;
    mockLsf.annotationStore.annotations = [];
    wrapper.task = { drafts: [] };

    await wrapper.setAnnotation(undefined, false, false);

    expect(mockLsf.annotationStore.createAnnotation).toHaveBeenCalled();
  });
});
