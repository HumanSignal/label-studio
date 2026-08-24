import { LSFWrapper } from "../lsf-sdk";

// BROS-1298 regression coverage: the FE Annotation MST model uses `draftId: 0`
// as a "no draft" sentinel. Sending that 0 over the wire poisoned backend
// bulk-update filters (BROS-1185 AnnotationHistory cross-contamination and a
// FK violation on lse_tasks_taskevent). `prepareData` is the single payload
// boundary for /annotations POST + PATCH and must coerce the sentinel to null.

const buildWrapper = ({ drafts = [] } = {}) => {
  // prepareData only touches `this.task.drafts` (via findActiveDraft) and
  // `this.calculateStartedAt`, so a stub object with the prototype methods
  // attached is enough — we do not run the LSFWrapper constructor.
  const wrapper = Object.create(LSFWrapper.prototype);
  wrapper.task = { drafts };
  return wrapper;
};

const buildAnnotation = ({ draftId, leadTime = 0 } = {}) => ({
  draftId,
  leadTime,
  loadedDate: new Date(),
  userGenerate: false,
  sentUserGenerate: false,
  versions: { draft: undefined },
  parent_prediction: null,
  parent_annotation: null,
  serializeAnnotation: () => [],
});

describe("LSFWrapper.prepareData draft_id normalization", () => {
  it("sends draft_id: null when draftId is the 0 sentinel", () => {
    const wrapper = buildWrapper();
    const payload = wrapper.prepareData(buildAnnotation({ draftId: 0 }));

    expect(payload.draft_id).toBeNull();
  });

  it("sends draft_id: null when draftId is undefined", () => {
    const wrapper = buildWrapper();
    const payload = wrapper.prepareData(buildAnnotation({ draftId: undefined }));

    expect(payload.draft_id).toBeNull();
  });

  it("preserves a real positive draft id", () => {
    const wrapper = buildWrapper({ drafts: [{ id: 42, created_at: new Date().toISOString(), lead_time: 1 }] });
    const payload = wrapper.prepareData(buildAnnotation({ draftId: 42 }));

    expect(payload.draft_id).toBe(42);
  });
});
